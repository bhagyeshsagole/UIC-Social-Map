import {installVisitDismissal} from './auth-fixture.mjs';
// Run against a dev server configured for https://kampuscape-test.supabase.co.
// All Auth/profile traffic is intercepted. No email is sent and no real user is created.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
const url=process.env.TEST_APP_URL||'http://127.0.0.1:5174';
const browser=await chromium.launch({headless:true});
const feed=JSON.parse(readFileSync(new URL('../public/campus-events.json',import.meta.url)));
const profiles=new Map(), verifications=[], resets=[], passwordUpdates=[], welcomeEmails=[];
let currentEmail='student@uic.edu',failSave=true;const signups=[];const PASSWORD='correct-horse-9';
const user=()=>({id:currentEmail==='second@uic.edu'?'00000000-0000-0000-0000-000000000002':'00000000-0000-0000-0000-000000000001',email:currentEmail,
 aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-10-07T12:00:00Z',created_at:'2026-10-07T12:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],is_anonymous:false});
const token=()=>{const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');return `${encoded({alg:'HS256',typ:'JWT'})}.${encoded({sub:user().id,email:currentEmail,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.synthetic-signature`;};
const errors=[];
async function setup(options={}, welcomeStatus=200){
 const context=await browser.newContext(options),page=await context.newPage();
 await installVisitDismissal(page);
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-07T18:00:00Z'));
 await page.route('**/api/campus-events',r=>r.fulfill({json:feed}));
 await page.route('**/api/account-created',r=>{welcomeEmails.push(r.request().headers().authorization);return r.fulfill({status:welcomeStatus,json:{sent:welcomeStatus===200}});});
 await page.route('https://kampuscape-test.supabase.co/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path.endsWith('/kampuscape_community_events'))return route.fulfill({json:[]});
  if(path.includes('/rest/v1/rpc/'))return route.fulfill({json:[]});
  if(path.endsWith('/settings'))return route.fulfill({json:{external:{email:true,google:true}}});
  if(path.endsWith('/signup')){const body=request.postDataJSON();signups.push(body.email);
   currentEmail=body.email;
   return route.fulfill({json:{access_token:token(),refresh_token:'synthetic-refresh-token',expires_in:3600,token_type:'bearer',user:{...user(),identities:[{id:'synthetic-identity'}]}}});}
  if(path.endsWith('/token')&&new URL(request.url()).searchParams.get('grant_type')==='password'){
   const body=request.postDataJSON();currentEmail=body.email;
   if(body.password!==PASSWORD)return route.fulfill({status:400,json:{code:400,error_code:'invalid_credentials',msg:'Invalid login credentials'}});
   return route.fulfill({json:{access_token:token(),refresh_token:'synthetic-refresh-token',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:user()}});
  }
  if(path.endsWith('/recover')){
   resets.push(new URL(request.url()).searchParams.get('redirect_to'));
   return route.fulfill({json:{}});
  }
  if(path.endsWith('/verify')){
   const body=request.postDataJSON();verifications.push({token_hash:body.token_hash,type:body.type});
   if(body.token_hash==='expired')return route.fulfill({status:403,json:{code:403,error_code:'otp_expired',msg:'Token has expired'}});
   return route.fulfill({json:{access_token:token(),refresh_token:'synthetic-refresh-token',expires_in:3600,token_type:'bearer',user:user()}});
  }
  if(path.endsWith('/user')){
   if(request.method()==='PUT')passwordUpdates.push(request.postDataJSON().password);
   return route.fulfill({json:user()});
  }
  if(path.endsWith('/logout'))return route.fulfill({status:204});
  if(path.endsWith('/kampuscape_profiles')){
   if(request.method()==='GET')return route.fulfill({json:profiles.has(user().id)?[profiles.get(user().id)]:[]});
   if(failSave){failSave=false;return route.fulfill({status:503,json:{message:'Synthetic temporary outage'}});}
   const profile=request.postDataJSON();profiles.set(profile.id,profile);return route.fulfill({status:201,json:profile});
  }
  throw new Error(`Unexpected mocked request: ${request.method()} ${path}`);
 });
 return page;
}
try{
 const page=await setup({viewport:{width:1440,height:1000}});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Open profile'}).click();
 const dialog=page.locator('.account-dialog');
 assert.equal(await page.getByLabel('UIC email',{exact:true}).count(),0,'first screen asks sign in or sign up');
 await page.getByRole('button',{name:'Create an account'}).click();
 await page.getByLabel('UIC email',{exact:true}).fill('student@gmail.com');await page.getByLabel('Password',{exact:true}).fill(PASSWORD);
 await page.getByRole('button',{name:'Create account'}).click();
 assert.match(await dialog.innerText(),/Use your @uic.edu/);assert.equal(signups.length,0);
 mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/onboarding-sign-in.png'});
 await page.getByLabel('UIC email',{exact:true}).fill('student@uic.edu');await page.getByLabel('Password',{exact:true}).fill('short');
 await page.getByRole('button',{name:'Create account'}).click();
 await page.getByText('at least 8 characters',{exact:false}).last().waitFor();assert.equal(signups.length,0,'short passwords never reach Supabase');
 await page.getByLabel('Password',{exact:true}).fill(PASSWORD);await page.getByRole('button',{name:'Create account'}).click();
 await page.getByRole('heading',{name:'Nice to meet you.'}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Verify your email.'}).count(),0,'signup opens onboarding immediately');
 assert.equal(await page.getByRole('button',{name:'Continue with Google'}).count(),0);
 assert.equal(welcomeEmails.length,1,'signup sends an authenticated welcome request');
 assert.match(welcomeEmails[0],/^Bearer /);assert.equal(verifications.length,0,'signup requires no verification');
 assert.deepEqual(signups,['student@uic.edu']);
 await page.getByRole('button',{name:'Use a different account'}).click();
 await page.getByRole('button',{name:'Open profile'}).click();await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'Welcome back.'}).waitFor();
 await page.getByLabel('UIC email',{exact:true}).fill('student@uic.edu');await page.getByLabel('Password',{exact:true}).fill('wrong-password');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByText('That email and password don’t match',{exact:false}).waitFor();
 await page.getByLabel('Password',{exact:true}).fill(PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 assert.equal(signups.length,1);assert.equal(welcomeEmails.length,1,'signing in sends no welcome email');assert.equal(resets.length,0,'signing in sends no reset email');
 await page.getByRole('heading',{name:'Nice to meet you.'}).waitFor();
 await page.keyboard.press('Escape');assert.equal(await dialog.evaluate(el=>el.open),true,'onboarding cannot be dismissed');
 await page.getByLabel('What should we call you?').fill('Test Explorer');
 await page.getByLabel('Pronouns').fill('they/them');await page.getByRole('button',{name:'Sprout',exact:true}).click();
 await page.screenshot({path:'artifacts/onboarding-profile.png'});
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Live music',exact:false}).click();await page.getByRole('button',{name:'Arts & culture',exact:false}).click();
 await page.screenshot({path:'artifacts/onboarding-interests.png'});
 await page.getByRole('button',{name:'Find my kind of plans'}).click();
 await page.getByText('Your profile couldn’t be saved.',{exact:false}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Live music',exact:false}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Find my kind of plans'}).click();
 await page.waitForFunction(()=>!document.querySelector('.account-dialog').open);
 assert.equal(profiles.get(user().id).display_name,'Test Explorer');
 await page.getByRole('button',{name:'Live events',exact:true}).click();
 await page.getByRole('heading',{name:'Picked for Test Explorer'}).waitFor();
 assert.ok(await page.locator('.recommendation-card').count());
 assert.match(await page.locator('.recommendation-reasons').first().innerText(),/Live music|Arts & culture/);
 await page.screenshot({path:'artifacts/onboarding-for-you.png'});
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Open profile'}).click();
 await page.getByRole('heading',{name:'Hey, Test Explorer.'}).waitFor();
 await page.getByRole('button',{name:'Edit profile & interests'}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Live music',exact:false}).click();await page.getByRole('button',{name:'Giving back',exact:false}).click();
 await page.getByRole('button',{name:'Save profile',exact:true}).click();
 assert.deepEqual(profiles.get(user().id).interests,['arts','volunteering']);
 await page.getByRole('button',{name:'Open profile'}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.account-dialog').open);
 await page.getByRole('button',{name:'Create event',exact:true}).click();await page.getByRole('heading',{name:/Your campus/}).waitFor();
 // A verified Google/OAuth account from another domain still fails the client guard.
 currentEmail='outsider@gmail.com';
 const rejected=await setup();
 await rejected.addInitScript(session=>localStorage.setItem('kampuscape-auth',JSON.stringify(session)),{access_token:token(),refresh_token:'synthetic-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:user()});
 await rejected.goto(url,{waitUntil:'domcontentloaded'});
 await rejected.getByText('Sign in with an @uic.edu account.',{exact:false}).waitFor();
 assert.equal(await rejected.getByRole('heading',{name:'Nice to meet you.'}).count(),0);
 currentEmail='student@uic.edu';
 const mobile=await setup({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.goto(url,{waitUntil:'domcontentloaded'});await mobile.getByRole('button',{name:'Open profile'}).click();
 const bounds=await mobile.locator('.account-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
 await mobile.screenshot({path:'artifacts/onboarding-mobile.png'});
 await mobile.getByRole('button',{name:'Sign in',exact:true}).click();
 await mobile.getByLabel('UIC email',{exact:true}).fill('second@uic.edu');await mobile.getByLabel('Password',{exact:true}).fill(PASSWORD);await mobile.getByRole('button',{name:'Sign in',exact:true}).click();
 await mobile.getByRole('heading',{name:'Nice to meet you.'}).waitFor();
 await mobile.getByLabel('What should we call you?').fill('Second Explorer');
 await mobile.getByRole('button',{name:'Fox',exact:true}).click();await mobile.screenshot({path:'artifacts/onboarding-mobile-profile.png'});
 await mobile.getByRole('button',{name:'Continue',exact:true}).click();await mobile.getByRole('button',{name:'Giving back',exact:false}).click();
 await mobile.screenshot({path:'artifacts/onboarding-mobile-interests.png'});
 await mobile.getByRole('button',{name:'Find my kind of plans'}).click();
 await mobile.waitForFunction(()=>!document.querySelector('.account-dialog').open);
 assert.equal(profiles.size,2);assert.equal(profiles.get(user().id).pronouns,'');
 const passwordOnly=await setup();
 await passwordOnly.goto(url,{waitUntil:'domcontentloaded'});await passwordOnly.getByRole('button',{name:'Open profile'}).click();
 await passwordOnly.getByRole('button',{name:'Sign in',exact:true}).click();
 assert.equal(await passwordOnly.getByRole('button',{name:'Continue with Google'}).count(),0,'only password login even if Google is enabled remotely');
 // Render the actual email button URLs and open each in a fresh browser context.
 const emailLink=(template,hash)=>{
  const html=readFileSync(new URL(`../../backend/supabase/templates/${template}.html`,import.meta.url),'utf8');
  assert.ok(!html.includes('{{ .Token }}'),'emails must contain links, not numeric codes');
  const href=html.match(/href="([^"\n]*token_hash[^"\n]*)"/)[1];
  return href.replace('{{ .RedirectTo }}',url).replace('{{ .TokenHash }}',hash).replaceAll('&amp;','&');
 };
 currentEmail='student@uic.edu';profiles.delete(user().id);
 const verified=await setup();
 await verified.goto(emailLink('confirmation','synthetic-confirmation'),{waitUntil:'domcontentloaded'});
 await verified.getByRole('heading',{name:'Nice to meet you.'}).waitFor();
 assert.deepEqual(verifications.at(-1),{token_hash:'synthetic-confirmation',type:'email'});
 assert.equal(new URL(verified.url()).searchParams.has('token_hash'),false,'verification token removed from address bar');
 const forgot=await setup();await forgot.goto(url,{waitUntil:'domcontentloaded'});
 await forgot.getByRole('button',{name:'Open profile'}).click();await forgot.getByRole('button',{name:'Sign in',exact:true}).click();
 await forgot.getByRole('button',{name:'Forgot password?'}).click();
 await forgot.getByLabel('UIC email',{exact:true}).fill('student@uic.edu');
 await forgot.getByRole('button',{name:'Email me a reset link'}).click();
 await forgot.getByRole('heading',{name:'Check your inbox.'}).waitFor();
 assert.equal(new URL(resets.at(-1)).origin,new URL(url).origin);
 assert.equal(await forgot.getByLabel('Reset code').count(),0);
 const recovered=await setup();
 await recovered.goto(emailLink('recovery','synthetic-recovery'),{waitUntil:'domcontentloaded'});
 await recovered.getByRole('heading',{name:'Choose a new password.'}).waitFor();
 assert.deepEqual(verifications.at(-1),{token_hash:'synthetic-recovery',type:'recovery'});
 assert.equal(new URL(recovered.url()).searchParams.has('token_hash'),false);
 await recovered.getByLabel('New password',{exact:true}).fill('new-synthetic-password-42');
 await recovered.getByRole('button',{name:'Save password'}).click();
 await recovered.getByRole('heading',{name:'Nice to meet you.'}).waitFor();
 assert.equal(passwordUpdates.at(-1),'new-synthetic-password-42');
 for(const template of ['confirmation','recovery']){
  const expired=await setup();await expired.goto(emailLink(template,'expired'),{waitUntil:'domcontentloaded'});
  await expired.getByText('has expired or was already used',{exact:false}).waitFor();
  assert.equal(new URL(expired.url()).searchParams.has('token_hash'),false);
  assert.equal(await expired.getByRole('heading',{name:'Choose a new password.'}).count(),0);
 }
 currentEmail='second@uic.edu';profiles.delete(user().id);
 const noMail=await setup({},503);await noMail.goto(url,{waitUntil:'domcontentloaded'});
 await noMail.getByRole('button',{name:'Open profile'}).click();await noMail.getByRole('button',{name:'Create an account'}).click();
 await noMail.getByLabel('UIC email',{exact:true}).fill('second@uic.edu');await noMail.getByLabel('Password',{exact:true}).fill(PASSWORD);
 await noMail.getByRole('button',{name:'Create account',exact:true}).click();
 await noMail.getByRole('heading',{name:'Nice to meet you.'}).waitFor();
 await noMail.getByText('Your account is ready, but we couldn’t send the welcome email.',{exact:false}).waitFor();
 assert.equal(await noMail.getByLabel('What should we call you?').count(),1,'mail failure keeps the account usable');
 assert.deepEqual(errors,[]);console.log('Onboarding browser checks passed: legacy confirmation/reset links on a fresh browser, password update, expired links, token cleanup, immediate UIC password signup, authenticated welcome email request, password-only sign-in without emails or Google, mandatory profile, retry, preferences, recommendations, reload, sign-out, non-UIC session rejection and phone layout.');
}finally{await browser.close();}
