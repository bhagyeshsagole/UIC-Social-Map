import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('reviews enforce public/anonymous privacy, ownership, membership, reports and deletion',async()=>{
 const db=new PGlite(),ids=[1,2].map(n=>`00000000-0000-0000-0000-00000000000${n}`);
 try{
 await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;create schema auth;grant usage on schema auth to anon,authenticated,supabase_auth_admin;create table auth.users(id uuid primary key,email text,email_change text default '',email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant execute on function auth.uid() to anon,authenticated;grant all on auth.users to supabase_auth_admin;grant usage on schema public to anon,authenticated;`);
 for(const f of ['202610070001_uic_profiles.sql','202610100003_place_reviews.sql'])await db.exec(await readFile(new URL(`../../backend/supabase/migrations/${f}`,import.meta.url),'utf8'));
 await db.exec("insert into public.kampuscape_review_places values('synthetic','Synthetic Cafe')");
 const as=async id=>{await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
 const read=async()=> (await db.query("select public.kampuscape_place_reviews('synthetic') data")).rows[0].data;
 for(let i=0;i<2;i++){await db.exec('reset role');await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[ids[i],`test${i}@uic.edu`]);await as(ids[i]);await db.query("insert into public.kampuscape_profiles(id,display_name,avatar_id,interests,onboarding_completed_at) values($1,$2,'fox','{music}',now())",[ids[i],`Synthetic ${i}`]);}
 await as(ids[0]);const rid=(await db.query("select public.kampuscape_save_review('synthetic',4,'Synthetic review body',true) id")).rows[0].id;
 for(const q of ["select public.kampuscape_save_review('unknown',4,'Synthetic review body',true)","select public.kampuscape_save_review('synthetic',8,'Synthetic review body',true)"])await assert.rejects(db.query(q));
 await as(ids[1]);let d=await read();assert.equal(d.count,1);assert.equal(d.average,4);assert.equal(d.reviews[0].display_name,'Anonymous student');assert.ok(!JSON.stringify(d).includes(ids[0]));assert.ok(!JSON.stringify(d).includes('Synthetic 0'));assert.equal(d.mine,null);
 await db.query('select public.kampuscape_delete_review($1)',[rid]);assert.equal((await read()).count,1);
 await db.query("select public.kampuscape_report_review($1,'Synthetic report reason')",[rid]);await assert.rejects(db.query('select * from public.kampuscape_review_reports'),/permission denied/);
 await as(ids[0]);await db.query("select public.kampuscape_save_review('synthetic',5,'Updated synthetic review',false)");d=await read();assert.equal(d.count,1);assert.equal(d.average,5);assert.equal(d.mine.display_name,'Synthetic 0');assert.equal(d.mine.id,rid);
 await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");assert.equal((await read()).reviews[0].display_name,'Synthetic 0');assert.equal((await read()).mine,null);await assert.rejects(db.query("select public.kampuscape_save_review('synthetic',5,'Forbidden review',false)"));await assert.rejects(db.query('select * from public.kampuscape_place_reviews'),/permission denied/);
 await db.exec('reset role');await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[ids[0]]);assert.equal((await read()).count,0);await db.query('delete from auth.users where id=$1',[ids[0]]);assert.equal((await db.query('select * from public.kampuscape_place_reviews')).rows.length,0);assert.equal((await db.query('select * from public.kampuscape_review_reports')).rows.length,0);
 }finally{await db.close();}
});
