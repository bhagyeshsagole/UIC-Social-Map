import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const migration = name => readFile(new URL(`../../backend/supabase/migrations/${name}`, import.meta.url), 'utf8');
const member = '00000000-0000-0000-0000-000000000001';

test('support requests are submit-only, normalized, linked to members and rate-limited', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;
      create schema auth;grant usage on schema auth to anon,authenticated,supabase_auth_admin;
      create table auth.users(id uuid primary key,email text,email_change text default '',email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant execute on function auth.uid() to anon,authenticated;grant all on auth.users to supabase_auth_admin;grant usage on schema public to anon,authenticated;`);
    await db.exec(await migration('202610070001_uic_profiles.sql'));
    await db.exec(await migration('202610070002_support_requests.sql'));
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [member, 'one@uic.edu']);
    const submit = (email, extra = {}) => db.query('insert into public.kampuscape_support_requests(kind,name,email,message,related_url) values($1,$2,$3,$4,$5)',
      [extra.kind ?? 'help', extra.name ?? '  Visitor ', email, extra.message ?? '  The map would not load on my phone.  ', '']);

    await db.exec('set role anon');
    await submit('Someone@Example.com ');
    await assert.rejects(db.query('select * from public.kampuscape_support_requests'), /permission denied/, 'anon cannot read requests');
    await assert.rejects(submit('a@b.co', {kind: 'spam'}), /check constraint/);
    await assert.rejects(submit('not-an-email'), /check constraint/);
    await assert.rejects(submit('a@b.co', {message: 'short'}), /check constraint/);
    await assert.rejects(db.query("insert into public.kampuscape_support_requests(kind,email,message,status) values('help','a@b.co','A long enough message','closed')"), /permission denied/, 'status is not client-writable');
    for (let i = 0; i < 4; i++) await submit('someone@example.com');
    await assert.rejects(submit('SOMEONE@example.com'), /Too many messages/, 'sixth message in an hour is refused, case-insensitively');

    await db.exec('reset role; set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [member]);
    await submit('one@uic.edu', {kind: 'report'});
    await assert.rejects(db.query('select * from public.kampuscape_support_requests'), /permission denied/, 'members cannot read requests');

    await db.exec('reset role');
    const {rows} = await db.query('select kind,name,email,message,user_id,status from public.kampuscape_support_requests order by created_at, kind');
    assert.equal(rows.length, 6);
    assert.deepEqual({...rows[0], user_id: rows[0].user_id ?? null}, {kind: 'help', name: 'Visitor', email: 'someone@example.com', message: 'The map would not load on my phone.', user_id: null, status: 'new'});
    assert.equal(rows.find(r => r.kind === 'report').user_id, member, 'signed-in submissions link the member');
  } finally { await db.close(); }
});
