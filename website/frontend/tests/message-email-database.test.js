import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const ids=[1,2].map(n=>`00000000-0000-0000-0000-00000000000${n}`),key='c'.repeat(64);
const migrations=['202610070001_uic_profiles.sql','202610070002_support_requests.sql','202610070003_delete_account.sql','202610070004_event_attendance.sql','202610070005_community_events.sql','202610070006_public_events_for_everyone.sql','202610070007_public_event_hosts.sql','202610100001_event_shares.sql','202610100002_direct_messages.sql','202610100004_message_emails.sql'];
test('message emails go to the right member once per unread streak, without message bodies or secrets in the browser path',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;create schema auth;grant usage on schema auth to anon,authenticated,supabase_auth_admin;
  create table auth.users(id uuid primary key,email text,email_change text default '',email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant execute on function auth.uid() to anon,authenticated;grant all on auth.users to supabase_auth_admin;grant usage on schema public to anon,authenticated;
  -- Synthetic stand-ins for Supabase Vault and pg_net.
  create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);
  create schema net;create table net.calls(id bigint generated always as identity,url text,body jsonb,headers jsonb);
  create function net.http_post(url text,body jsonb,headers jsonb) returns bigint language sql as $$insert into net.calls(url,body,headers) values(url,body,headers) returning id$$;`);
  for(const name of migrations)await db.exec(await readFile(new URL(`../../backend/supabase/migrations/${name}`,import.meta.url),'utf8'));
  const as=async id=>{await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
  const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
  const calls=async()=>{await db.exec('reset role');const rows=await query('select * from net.calls order by id');return rows;};
  for(const [index,id] of ids.entries()){
   await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,`synthetic${index}@uic.edu`]);
   await as(id);await db.query("insert into public.kampuscape_profiles(id,display_name,avatar_id,interests,onboarding_completed_at) values($1,$2,'fox','{music}',now())",[id,`Member ${index}`]);await db.exec('reset role');
  }
  await as(ids[1]);await query("select public.kampuscape_attend($1,'Synthetic <b>jazz</b> & plan','anonymous')",[key]);
  await as(ids[0]);const [target]=await query('select * from public.kampuscape_event_contacts($1)',[key]);
  const tid=(await query('select public.kampuscape_request_message($1) id',[target.contact_id]))[0].id;
  assert.equal((await calls()).length,0,'no secrets configured: messaging works and nothing is sent');

  await db.exec("insert into vault.decrypted_secrets values('kampuscape_resend_api_key','re_synthetic'),('kampuscape_resend_from','accounts@kampuscape.com');delete from public.kampuscape_message_threads");
  await as(ids[0]);const request=(await query('select public.kampuscape_request_message($1) id',[target.contact_id]))[0].id;
  let sent=await calls();assert.equal(sent.length,1);
  assert.equal(sent[0].url,'https://api.resend.com/emails');assert.deepEqual(sent[0].body.to,['synthetic1@uic.edu']);
  assert.equal(sent[0].headers.Authorization,'Bearer re_synthetic');assert.equal(sent[0].headers['Idempotency-Key'],`message-request/${request}`);
  assert.match(sent[0].body.subject,/Member 0 wants to message you/);
  assert.match(sent[0].body.html,/Synthetic &lt;b&gt;jazz&lt;\/b&gt; &amp; plan/);assert.doesNotMatch(sent[0].body.html,/<b>jazz/);
  assert.notEqual(tid,request);

  await as(ids[1]);await query("select public.kampuscape_message_action($1,'accept')",[request]);
  await as(ids[0]);await query("select public.kampuscape_send_message($1,'Private hello',$2)",[request,crypto.randomUUID()]);
  assert.equal((await calls()).length,1,'no email while the recipient was active in the last two minutes');

  await db.exec(`update public.kampuscape_message_threads set recipient_read_at=now()-interval '10 minutes',recipient_emailed_at=now()-interval '20 minutes'`);
  await as(ids[0]);await query("select public.kampuscape_send_message($1,'Private hello again',$2)",[request,crypto.randomUUID()]);
  await as(ids[0]);await query("select public.kampuscape_send_message($1,'Are you there?',$2)",[request,crypto.randomUUID()]);
  sent=await calls();assert.equal(sent.length,2,'one email per unread streak');
  assert.deepEqual(sent[1].body.to,['synthetic1@uic.edu']);assert.match(sent[1].body.subject,/New message from Member 0/);
  assert.doesNotMatch(JSON.stringify(sent[1].body),/Private hello|Are you there/,'message bodies stay out of email');

  await db.exec(`update public.kampuscape_message_threads set recipient_read_at=now()-interval '5 minutes',recipient_emailed_at=now()-interval '6 minutes'`);
  await as(ids[0]);await query("select public.kampuscape_send_message($1,'After reading',$2)",[request,crypto.randomUUID()]);
  assert.equal((await calls()).length,3,'a new email after the member opened the conversation');

  await db.exec(`update public.kampuscape_message_threads set recipient_read_at=now()-interval '5 minutes',recipient_emailed_at=now()-interval '6 minutes';drop function net.http_post(text,jsonb,jsonb)`);
  await as(ids[0]);await query("select public.kampuscape_send_message($1,'Provider down',$2)",[request,crypto.randomUUID()]);
  await db.exec('reset role');assert.equal((await query("select count(*)::int n from public.kampuscape_messages where body='Provider down'"))[0].n,1,'a failing email never blocks the message');
  await as(ids[1]);await assert.rejects(query("select kampuscape_private.send_message_email($1,'x','x','x')",[ids[0]]),/permission denied/,'members cannot send email directly');
 }finally{await db.close();}
});
