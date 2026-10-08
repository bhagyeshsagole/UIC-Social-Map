import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const migration = name => readFile(new URL(`../../backend/supabase/migrations/${name}`, import.meta.url), 'utf8');
const [one, two, three] = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'];
const key = c => c.repeat(64);

test('attendance: profile or per-event anonymous identity, members-only lists, no account linkage', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;
      create schema auth;grant usage on schema auth to anon,authenticated,supabase_auth_admin;
      create table auth.users(id uuid primary key,email text,email_change text default '',email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant execute on function auth.uid() to anon,authenticated;grant all on auth.users to supabase_auth_admin;grant usage on schema public to anon,authenticated;`);
    for (const name of ['202610070001_uic_profiles.sql', '202610070002_support_requests.sql', '202610070003_delete_account.sql', '202610070004_event_attendance.sql']) await db.exec(await migration(name));
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now()),($5,$6,null)', [one, 'one@uic.edu', two, 'two@uic.edu', three, 'unverified@uic.edu']);
    const as = async id => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
    const call = (sql, params) => db.query(sql, params).then(r => r.rows);
    for (const [id, name, avatar] of [[one, 'Alex Member', 'fox'], [two, 'Sam Member', 'wave']]) {
      await as(id); await call("insert into public.kampuscape_profiles(id,display_name,avatar_id,interests) values($1,$2,$3,'{music}')", [id, name, avatar]);
    }

    await as(one);
    assert.deepEqual(await call("select * from public.kampuscape_attend($1,'Synthetic Concert','profile')", [key('a')]), [{display_name:'Alex Member', avatar_id:'fox', anonymous:false}]);
    await as(two);
    const [first] = await call("select * from public.kampuscape_attend($1,'Synthetic Concert','anonymous')", [key('a')]);
    assert.equal(first.anonymous, true); assert.match(first.display_name, /^[A-Z][a-z]+ [A-Z][a-z]+/); assert.notEqual(first.display_name, 'Sam Member');
    const [again] = await call("select * from public.kampuscape_attend($1,'Synthetic Concert','anonymous')", [key('a')]);
    assert.equal(again.display_name, first.display_name, 're-confirming keeps the alias for that event');
    const others = [];
    for (const c of 'bcdef01') others.push((await call("select * from public.kampuscape_attend($1,'Another event','anonymous')", [key(c)]))[0].display_name);
    assert.equal(new Set([first.display_name, ...others]).size, 8, 'a different alias for every event');

    // The list exposes names/avatars only: no ids, emails or mappings.
    const list = await call('select * from public.kampuscape_event_attendees($1)', [key('a')]);
    assert.deepEqual(Object.keys(list[0]).sort(), ['anonymous', 'avatar_id', 'display_name', 'is_you', 'total']);
    assert.deepEqual(list.map(r => [r.display_name, r.anonymous, r.is_you, Number(r.total)]), [['Alex Member', false, false, 2], [first.display_name, true, true, 2]]);
    assert.ok(!JSON.stringify(list).includes('Sam Member') && !JSON.stringify(list).includes('@'), 'anonymous attendee not linked to the profile');

    // Toggle visibility from My Events: anonymous -> profile -> anonymous.
    assert.equal((await call("select * from public.kampuscape_attend($1,'Synthetic Concert','profile')", [key('a')]))[0].display_name, 'Sam Member');
    assert.deepEqual((await call('select display_name,anonymous from public.kampuscape_my_attendance() where event_key=$1', [key('a')]))[0], {display_name:'Sam Member', anonymous:false});
    assert.equal((await call("select * from public.kampuscape_attend($1,'Synthetic Concert','anonymous')", [key('a')]))[0].anonymous, true);

    await assert.rejects(call('select * from public.kampuscape_attendance'), /permission denied/, 'no direct table reads');
    await assert.rejects(call("select * from public.kampuscape_attend('not-a-key','x','profile')"), /Unknown event/);
    await assert.rejects(call("select * from public.kampuscape_attend($1,'x','public')", [key('a')]), /Choose how to attend/);
    await as(three);
    await assert.rejects(call("select * from public.kampuscape_attend($1,'x','anonymous')", [key('a')]), /verified UIC account/);
    await assert.rejects(call('select * from public.kampuscape_event_attendees($1)', [key('a')]), /verified UIC account/);
    await db.exec("reset role; set role anon; select set_config('request.jwt.claim.sub','',false)");
    await assert.rejects(call('select * from public.kampuscape_event_attendees($1)', [key('a')]), /permission denied/);

    await as(two); await call('select public.kampuscape_leave_event($1)', [key('b')]);
    assert.equal((await call('select * from public.kampuscape_my_attendance()')).length, 7);
    // Account deletion removes attendance and every alias with it.
    await call('select public.kampuscape_delete_account()');
    await db.exec('reset role');
    assert.deepEqual((await call('select distinct user_id from public.kampuscape_attendance')).map(r => r.user_id), [one]);
  } finally { await db.close(); }
});
