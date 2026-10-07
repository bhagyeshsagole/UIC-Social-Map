// Run against a dev server configured for https://kampuscape-test.supabase.co.
// All Auth/profile traffic is intercepted. No email is sent and no real user is created.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
const url=process.env.TEST_APP_URL||'http://127.0.0.1:5174';
const browser=await chromium.launch({headless:true});
const feed=JSON.parse(readFileSync(new URL('../public/campus-events.json',import.meta.url)));
const profiles=new Map();
let currentEmail='student@uic.edu',failSave=true,otpRequests=0;
const user=()=>({id:currentEmail==='second@uic.edu'?'00000000-0000-0000-0000-000000000002':'00000000-0000-0000-0000-000000000001',email:currentEmail,
 aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-10-07T12:00:00Z',created_at:'2026-10-07T12:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],is_anonymous:false});
const token=()=>{const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');return `${encoded({alg:'HS256',typ:'JWT'})}.${encoded({sub:user().id,email:currentEmail,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.synthetic-signature`;};
const errors=[];
async function setup(options={}){
 const context=await browser.newContext(options),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-07T18:00:00Z'));
 await page.route('**/api/campus-events',r=>r.fulfill({json:feed}));
 await page.route('https://kampuscape-test.supabase.co/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path.endsWith('/otp')){otpRequests++;currentEmail=request.postDataJSON().email;return route.fulfill({json:{}});}
  if(path.endsWith('/verify')){
   if(request.postDataJSON().token!=='123456')return route.fulfill({status:403,json:{msg:'Token has expired or is invalid',error_code:'otp_expired'}});
   return route.fulfill({json:{access_token:token(),refresh_token:'synthetic-refresh-token',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:user()}});
  }
  if(path.endsWith('/user'))return route.fulfill({json:user()});
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
 await page.getByLabel('UIC email',{exact:true}).fill('student@gmail.com');
 await page.getByRole('button',{name:'Email me a sign-in link'}).click();
 assert.match(await dialog.innerText(),/Use your @uic.edu/);assert.equal(otpRequests,0);
 mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/onboarding-sign-in.png'});
 await page.getByLabel('UIC email',{exact:true}).fill('student@uic.edu');
 await page.getByRole('button',{name:'Email me a sign-in link'}).click();
 await page.getByRole('button',{name:'Have a 6-digit code instead?'}).click();await page.getByLabel('Verification code').fill('000000');await page.getByRole('button',{name:'Verify & continue'}).click();
 await page.getByText('That code is invalid or expired.',{exact:false}).waitFor();
 await page.getByLabel('Verification code').fill('123456');await page.getByRole('button',{name:'Verify & continue'}).click();
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
 await rejected.getByText('Sign in with a verified @uic.edu account.',{exact:false}).waitFor();
 assert.equal(await rejected.getByRole('heading',{name:'Nice to meet you.'}).count(),0);
 currentEmail='student@uic.edu';
 const mobile=await setup({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.goto(url,{waitUntil:'domcontentloaded'});await mobile.getByRole('button',{name:'Open profile'}).click();
 const bounds=await mobile.locator('.account-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
 await mobile.screenshot({path:'artifacts/onboarding-mobile.png'});
 await mobile.getByLabel('UIC email',{exact:true}).fill('second@uic.edu');await mobile.getByRole('button',{name:'Email me a sign-in link'}).click();
 await mobile.getByRole('button',{name:'Have a 6-digit code instead?'}).click();await mobile.getByLabel('Verification code').fill('123456');await mobile.getByRole('button',{name:'Verify & continue'}).click();
 await mobile.getByRole('heading',{name:'Nice to meet you.'}).waitFor();
 await mobile.getByLabel('What should we call you?').fill('Second Explorer');
 await mobile.getByRole('button',{name:'Fox',exact:true}).click();await mobile.screenshot({path:'artifacts/onboarding-mobile-profile.png'});
 await mobile.getByRole('button',{name:'Continue',exact:true}).click();await mobile.getByRole('button',{name:'Giving back',exact:false}).click();
 await mobile.screenshot({path:'artifacts/onboarding-mobile-interests.png'});
 await mobile.getByRole('button',{name:'Find my kind of plans'}).click();
 await mobile.waitForFunction(()=>!document.querySelector('.account-dialog').open);
 assert.equal(profiles.size,2);assert.equal(profiles.get(user().id).pronouns,'');
 const google=await setup();
 let authorization;
 await google.route('**/auth/v1/authorize?**',r=>{authorization=new URL(r.request().url());return r.fulfill({contentType:'text/html',body:'Synthetic OAuth redirect'});});
 await google.goto(url,{waitUntil:'domcontentloaded'});await google.getByRole('button',{name:'Open profile'}).click();
 await google.getByRole('button',{name:'Continue with Google'}).click();await google.waitForURL('**/auth/v1/authorize?**');
 assert.equal(authorization.searchParams.get('provider'),'google');assert.equal(authorization.searchParams.get('hd'),'uic.edu');
 assert.equal(authorization.searchParams.get('code_challenge_method'),'s256');assert.equal(new URL(authorization.searchParams.get('redirect_to')).origin,new URL(url).origin);
 assert.deepEqual(errors,[]);console.log('Onboarding browser checks passed: email validation/OTP, mandatory profile, retry, preferences, recommendations, reload, sign-out, non-UIC session rejection and phone layout.');
}finally{await browser.close();}
