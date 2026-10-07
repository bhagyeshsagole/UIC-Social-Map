import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const ids=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'];

test('Postgres migration enforces domains, token checks, profile validation and private row access',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;
   create schema auth;grant usage on schema auth to authenticated,supabase_auth_admin;
   create table auth.users(id uuid primary key,email text,email_change text default '',email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant execute on function auth.uid() to authenticated;
   grant all on auth.users to supabase_auth_admin;`);
  await db.exec(await readFile(new URL('../../backend/supabase/migrations/202610070001_uic_profiles.sql',import.meta.url),'utf8'));
  await db.exec('set role supabase_auth_admin');
  for(const email of ['someone@gmail.com','someone@uic.edu.evil.org','someone@dept.uic.edu','x@uic.edu@evil.org']){
   await assert.rejects(db.query('insert into auth.users(id,email) values($1,$2)',[ids[0],email]),/requires an @uic.edu/);
   const {rows}=await db.query('select public.kampuscape_before_user_created($1::jsonb) result',[JSON.stringify({user:{email}})]);
   assert.equal(rows[0].result.error.http_code,403);
  }
  await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now()),($5,$6,null)',[ids[0],'one@uic.edu',ids[1],'two@uic.edu',ids[2],'unverified@uic.edu']);
  await assert.rejects(db.query('update auth.users set email_change=$1 where id=$2',['other@gmail.com',ids[0]]),/requires an @uic.edu/);
  const claims={email:'one@uic.edu',role:'authenticated'};
  let result=await db.query('select public.kampuscape_access_token_hook($1::jsonb) result',[JSON.stringify({user_id:ids[0],claims})]);
  assert.deepEqual(result.rows[0].result,{claims});
  result=await db.query('select public.kampuscape_access_token_hook($1::jsonb) result',[JSON.stringify({user_id:ids[2],claims:{email:'unverified@uic.edu'}})]);
  assert.equal(result.rows[0].result.error.http_code,403);
  await db.exec('reset role; set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[0]]);
  const insert=(id,interests=['music'])=>db.query('insert into public.kampuscape_profiles(id,display_name,pronouns,avatar_id,interests) values($1,$2,$3,$4,$5)',[id,'Test Profile','','orbit',interests]);
  await insert(ids[0]);
  await assert.rejects(insert(ids[1]),/row-level security/);
  for(const interests of [['unknown'],[],['music','music'],[null]]){
   await assert.rejects(db.query('update public.kampuscape_profiles set interests=$1 where id=$2',[interests,ids[0]]));
  }
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[1]]);
  assert.equal((await db.query('select * from public.kampuscape_profiles')).rows.length,0);
  assert.equal((await db.query('update public.kampuscape_profiles set display_name=$1 where id=$2 returning id',['Intruder',ids[0]])).rows.length,0);
  await insert(ids[1],['arts']);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[2]]);
  await assert.rejects(insert(ids[2]),/row-level security/);
  await assert.rejects(db.query('select public.kampuscape_access_token_hook($1::jsonb)',[JSON.stringify({user_id:ids[0],claims})]),/permission denied/);
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('select * from public.kampuscape_profiles'),/permission denied/);
  await db.exec('reset role');
  await db.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[ids[0]]);
  await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[0]]);
  assert.equal((await db.query('select * from public.kampuscape_profiles')).rows.length,0,'an existing JWT cannot bypass a current ban');
 }finally{await db.close();}
});
