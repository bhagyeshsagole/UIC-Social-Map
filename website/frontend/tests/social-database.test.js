import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const ids=[1,2,3].map(n=>`00000000-0000-0000-0000-00000000000${n}`),key='a'.repeat(64);
const migrations=['202610070001_uic_profiles.sql','202610070002_support_requests.sql','202610070003_delete_account.sql','202610070004_event_attendance.sql','202610070005_community_events.sql','202610070006_public_events_for_everyone.sql','202610070007_public_event_hosts.sql','202610100001_event_shares.sql','202610100002_direct_messages.sql'];
test('share capabilities and consent-based messages enforce ownership, isolation, aliases, blocks and deletion',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;create schema auth;grant usage on schema auth to anon,authenticated,supabase_auth_admin;
  create table auth.users(id uuid primary key,email text,email_change text default '',email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant execute on function auth.uid() to anon,authenticated;grant all on auth.users to supabase_auth_admin;grant usage on schema public to anon,authenticated;`);
  for(const name of migrations)await db.exec(await readFile(new URL(`../../backend/supabase/migrations/${name}`,import.meta.url),'utf8'));
  const as=async id=>{await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
  const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
  for(const [index,id] of ids.entries()){
   await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,`synthetic${index}@uic.edu`]);
   await as(id);await db.query("insert into public.kampuscape_profiles(id,display_name,avatar_id,interests,onboarding_completed_at) values($1,$2,'fox','{music}',now())",[id,`Member ${index}`]);await db.exec('reset role');
  }
  await as(ids[0]);
  const date=(await query("select ((now() at time zone 'America/Chicago')::date+1)::text date"))[0].date;
  const event={id:'11111111-1111-4111-8111-111111111111',title:'Synthetic jazz plan',date,time:'18:30',venue:{id:'test',name:'Synthetic Hall',coords:[-87.65,41.87]},host:{name:'Forged host'}};
  const token=(await query('select public.kampuscape_share_event($1::jsonb) token',[JSON.stringify(event)]))[0].token;
  assert.equal((await query('select public.kampuscape_share_event($1::jsonb) token',[JSON.stringify(event)]))[0].token,token,'stable share URL');
  await as(ids[1]);await assert.rejects(query('select public.kampuscape_share_event($1::jsonb)',[JSON.stringify(event)]),/Only the host/);
  await query('select public.kampuscape_revoke_share($1)',[event.id]);
  await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");
  const shared=(await query('select public.kampuscape_shared_event($1) event',[token]))[0].event;
  assert.equal(shared.host.name,'Member 0');assert.equal(shared.title,event.title);assert.ok(!JSON.stringify(shared).includes(ids[0]));
  await assert.rejects(query('select * from public.kampuscape_event_shares'),/permission denied/);
  assert.equal((await query('select public.kampuscape_shared_event($1) event',[ids[2]]))[0].event,null);
  await assert.rejects(query('select public.kampuscape_share_event($1::jsonb)',[JSON.stringify(event)]),/permission denied/);
  await as(ids[1]);await query("select public.kampuscape_attend($1,'Synthetic jazz plan','anonymous')",[key]);
  const contact=(await query('select * from public.kampuscape_event_contacts($1)',[key]))[0];assert.equal(contact.contact_id,null,'cannot message yourself');
  await as(ids[0]);const [target]=await query('select * from public.kampuscape_event_contacts($1)',[key]);assert.ok(target.contact_id);assert.notEqual(target.display_name,'Member 1');assert.ok(!JSON.stringify(target).includes(ids[1]));
  const tid=(await query('select public.kampuscape_request_message($1) id',[target.contact_id]))[0].id;
  assert.equal((await query('select public.kampuscape_request_message($1) id',[target.contact_id]))[0].id,tid,'request retries are idempotent');
  await assert.rejects(query("select public.kampuscape_send_message($1,'Hello',$2)",[tid,ids[0]]),/must accept/);
  await assert.rejects(query("select public.kampuscape_message_action($1,'accept')",[tid]),/unavailable/,'sender cannot accept own request');
  await assert.rejects(query('select * from public.kampuscape_message_history($1)',[tid]),/Accept/);
  await as(ids[2]);assert.equal((await query('select * from public.kampuscape_message_inbox()')).length,0);await assert.rejects(query('select * from public.kampuscape_message_history($1)',[tid]),/Accept/);
  await as(ids[1]);let inbox=await query('select * from public.kampuscape_message_inbox()');assert.equal(inbox[0].incoming,true);assert.equal(inbox[0].status,'pending');assert.equal(inbox[0].your_name,target.display_name);assert.ok(!JSON.stringify(inbox).includes(ids[0]));
  await query("select public.kampuscape_message_action($1,'accept')",[tid]);
  await as(ids[0]);const mid=(await query("select public.kampuscape_send_message($1,'Hello',$2) id",[tid,ids[0]]))[0].id;
  assert.equal((await query("select public.kampuscape_send_message($1,'Hello',$2) id",[tid,ids[0]]))[0].id,mid);
  await as(ids[1]);let history=await query('select * from public.kampuscape_message_history($1)',[tid]);assert.equal(history.length,1);assert.equal(history[0].body,'Hello');assert.equal(history[0].is_you,false);
  await query("select public.kampuscape_message_action($1,'block')",[tid]);
  await as(ids[0]);await assert.rejects(query("select public.kampuscape_send_message($1,'Blocked message',$2)",[tid,ids[1]]),/blocked/);await assert.rejects(query('select public.kampuscape_request_message($1)',[target.contact_id]),/unavailable/);
  assert.equal((await query('select * from public.kampuscape_event_contacts($1)',[key]))[0].contact_id,null,'blocked member gets no contact action');
  await as(ids[1]);await query("select public.kampuscape_attend($1,'Other event','anonymous')",['b'.repeat(64)]);
  await as(ids[0]);assert.equal((await query('select * from public.kampuscape_event_contacts($1)',['b'.repeat(64)]))[0].contact_id,null,'block follows account across aliases');
  await as(ids[1]);await query("select public.kampuscape_message_action($1,'unblock')",[tid]);
  await as(ids[2]);for(const table of ['kampuscape_messages','kampuscape_message_threads','kampuscape_message_blocks'])await assert.rejects(query(`select * from public.${table}`),/permission denied/);
  await as(ids[0]);await query('select public.kampuscape_delete_account()');await db.exec('reset role');
  assert.equal((await query('select * from public.kampuscape_messages')).length,0);assert.equal((await query('select * from public.kampuscape_message_threads')).length,0);assert.equal((await query('select * from public.kampuscape_event_shares')).length,0);
 }finally{await db.close();}
});
