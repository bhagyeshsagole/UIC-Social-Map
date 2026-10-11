import test from 'node:test';
import assert from 'node:assert/strict';
import {sendAccountCreated} from '../functions/uic/api/account-created.js';

const now = Date.parse('2026-10-10T18:00:00Z');
const member = {id:'synthetic-user',email:'student@uic.edu',email_confirmed_at:'2026-10-10T18:00:00Z',created_at:'2026-10-10T18:00:00Z'};
const env = {SUPABASE_PUBLISHABLE_KEY:'public-test',RESEND_API_KEY:'secret-test',RESEND_FROM_EMAIL:'accounts@kampuscape.com'};
const context = () => ({env, request:new Request('https://kampuscape.com/uic/api/account-created', {method:'POST',headers:{Authorization:'Bearer synthetic-token'},body:JSON.stringify({email:'attacker@example.com'})})});

test('welcome email uses the authoritative account recipient and stable idempotency, never browser input', async () => {
  const sent = [];
  const fetcher = async (url, options) => {
    if (url.endsWith('/user')) {
      assert.equal(options.headers.Authorization,'Bearer synthetic-token');
      assert.equal(options.headers.apikey,'public-test');
      return Response.json(member);
    }
    sent.push(options);
    return Response.json({id:'synthetic-email'});
  };
  for (let attempt=0;attempt<2;attempt++) assert.equal((await sendAccountCreated(context(),fetcher,now)).status,200);
  assert.equal(sent[0].headers['Idempotency-Key'],sent[1].headers['Idempotency-Key']);
  const email = JSON.parse(sent[0].body);
  assert.deepEqual(email.to,['student@uic.edu']);
  assert.match(email.text,/account is created/);
  assert.doesNotMatch(email.html,/token_hash|Verify|password=/);
});

test('unauthenticated, expired, non-UIC and old accounts cannot send welcome emails', async () => {
  let calls = 0;
  const unauthenticated = context();unauthenticated.request.headers.delete('Authorization');
  assert.equal((await sendAccountCreated(unauthenticated,()=>{calls++;},now)).status,401);
  assert.equal(calls,0);
  assert.equal((await sendAccountCreated(context(),async()=>new Response('',{status:401}),now)).status,401);
  for (const patch of [{email:'student@gmail.com'},{email:'student@uic.edu.evil.com'},{is_anonymous:true},{email_confirmed_at:null},{created_at:'2026-10-09T18:00:00Z'},{created_at:'2026-10-11T18:00:00Z'},{created_at:'invalid'}]) {
    calls=0;
    const response = await sendAccountCreated(context(),async()=>{calls++;return Response.json({...member,...patch});},now);
    assert.equal(response.status,403);assert.equal(calls,1,'rejected before contacting Resend');
  }
});

test('mail failures are retryable and never expose provider details or secrets', async () => {
  let calls=0;
  const response=await sendAccountCreated(context(),async()=>++calls===1?Response.json(member):new Response('secret-test private error',{status:429}),now);
  assert.equal(response.status,502);
  assert.doesNotMatch(await response.text(),/secret-test|private error/);
  const missing=context();missing.env={};
  assert.equal((await sendAccountCreated(missing,()=>assert.fail('must not call a provider'),now)).status,503);
});
