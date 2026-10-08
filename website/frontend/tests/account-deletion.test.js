import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const migration = name => readFile(new URL(`../../backend/supabase/migrations/${name}`, import.meta.url), 'utf8');
const [one, two] = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];

test('a member can erase only their own account, profile and support messages', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;
      create schema auth;grant usage on schema auth to anon,authenticated,supabase_auth_admin;
      create table auth.users(id uuid primary key,email text,email_change text default '',email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant execute on function auth.uid() to anon,authenticated;grant all on auth.users to supabase_auth_admin;grant usage on schema public to anon,authenticated;`);
    for (const name of ['202610070001_uic_profiles.sql', '202610070002_support_requests.sql', '202610070003_delete_account.sql']) await db.exec(await migration(name));
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())', [one, 'one@uic.edu', two, 'two@uic.edu']);
    await db.exec('set role authenticated');
    for (const [id, email] of [[one, 'one@uic.edu'], [two, 'two@uic.edu']]) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.query("insert into public.kampuscape_profiles(id,display_name,avatar_id,interests) values($1,'Test Member','orbit','{music}')", [id]);
      await db.query("insert into public.kampuscape_support_requests(kind,email,message) values('help',$1,'A support message long enough.')", [email]);
    }
    await db.exec("reset role; set role anon; select set_config('request.jwt.claim.sub','',false)");
    // Sent while signed out, but from member one's address: also theirs to erase.
    await db.query("insert into public.kampuscape_support_requests(kind,email,message) values('bug','ONE@uic.edu','Another message long enough.')");
    await assert.rejects(db.query('select public.kampuscape_delete_account()'), /permission denied/, 'signed-out visitors cannot call it');

    await db.exec('reset role; set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [one]);
    await db.query('select public.kampuscape_delete_account()');

    await db.exec('reset role');
    const left = async sql => (await db.query(sql)).rows.map(r => Object.values(r)[0]);
    assert.deepEqual(await left('select email from auth.users'), ['two@uic.edu']);
    assert.deepEqual(await left('select id from public.kampuscape_profiles'), [two]);
    assert.deepEqual(await left('select email from public.kampuscape_support_requests'), ['two@uic.edu']);
  } finally { await db.close(); }
});
