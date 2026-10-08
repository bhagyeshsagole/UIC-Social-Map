import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const migration = name => readFile(new URL(`../../backend/supabase/migrations/${name}`, import.meta.url), 'utf8');
const [one, two, three] = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'];
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const venue = JSON.stringify({id:'pin:synthetic', name:'Synthetic Hall', coords:[-87.65, 41.87], kind:'building'});

test('community events: members read, creators publish and delete their own, creator never exposed', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;
      create schema auth;grant usage on schema auth to anon,authenticated,supabase_auth_admin;
      create table auth.users(id uuid primary key,email text,email_change text default '',email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant execute on function auth.uid() to anon,authenticated;grant all on auth.users to supabase_auth_admin;grant usage on schema public to anon,authenticated;`);
    for (const name of ['202610070001_uic_profiles.sql', '202610070002_support_requests.sql', '202610070003_delete_account.sql', '202610070004_event_attendance.sql', '202610070005_community_events.sql']) await db.exec(await migration(name));
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now()),($5,$6,null)', [one, 'one@uic.edu', two, 'two@uic.edu', three, 'unverified@uic.edu']);
    const as = async uid => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]); };
    const rows = (sql, p) => db.query(sql, p).then(r => r.rows);
    const publish = (n, extra = {}) => rows(`insert into public.kampuscape_community_events(id,title,description,date,time,venue) values($1,$2,'',$3,$4,$5::jsonb)`,
      [id(n), extra.title ?? ' Synthetic Watch Party ', extra.date ?? '2099-01-01', extra.time ?? '20:30', venue]);

    await as(one);
    await publish(1);
    await assert.rejects(rows("insert into public.kampuscape_community_events(id,creator_id,title,date,time,venue) values($1,$2,'x','2099-01-01','20:00',$3::jsonb)", [id(2), two, venue]), /permission denied/, 'cannot set creator');
    await assert.rejects(publish(3, {date:'2001-01-01'}), /future date/);
    await assert.rejects(publish(4, {time:'25:00'}), /check constraint/);
    await assert.rejects(rows('select creator_id from public.kampuscape_community_events'), /permission denied/, 'creator column unreadable');

    await as(two);
    const seen = await rows('select id,title,date,time from public.kampuscape_community_events');
    assert.deepEqual(seen.map(r => [r.id, r.title, r.time]), [[id(1), 'Synthetic Watch Party', '20:30']], 'other members see it, title trimmed');
    assert.equal((await rows('delete from public.kampuscape_community_events where id=$1 returning id', [id(1)])).length, 0, 'cannot delete someone else’s event');
    for (let n = 10; n < 20; n++) await publish(n);
    await assert.rejects(publish(20), /10 public events a day/);

    await as(three);
    assert.equal((await rows('select id from public.kampuscape_community_events')).length, 0, 'unverified accounts see nothing');
    await db.exec("reset role; set role anon; select set_config('request.jwt.claim.sub','',false)");
    await assert.rejects(rows('select id from public.kampuscape_community_events'), /permission denied/, 'guests see nothing');

    await as(one);
    assert.equal((await rows('delete from public.kampuscape_community_events where id=$1 returning id', [id(1)])).length, 1, 'creator can delete');
    await as(two); await rows('select public.kampuscape_delete_account()');
    await db.exec('reset role');
    assert.equal((await rows('select count(*)::int n from public.kampuscape_community_events'))[0].n, 0, 'deleted with the account');
  } finally { await db.close(); }
});
