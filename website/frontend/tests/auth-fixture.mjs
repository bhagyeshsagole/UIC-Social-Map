import {randomUUID} from 'node:crypto';
export const shareRecords=new Map();
export async function installVisitDismissal(page){
 await page.addLocatorHandler(page.locator('.guide-dialog[open]'),()=>page.getByRole('button',{name:'Close guide'}).click());
 await page.addLocatorHandler(page.locator('.happening-dialog[open]'),()=>page.getByRole('button',{name:'Close recommendations'}).click());
}
// Test-only Auth transport. This file is never imported by the application.
export const TEST_USER_ID='00000000-0000-0000-0000-000000000001';
export async function installMember(page) {
 await installVisitDismissal(page);
 const user={id:TEST_USER_ID,email:'synthetic@uic.edu',email_confirmed_at:'2026-10-07T12:00:00Z',
  aud:'authenticated',role:'authenticated',created_at:'2026-10-07T12:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],is_anonymous:false};
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const expires=Math.floor(Date.now()/1000)+3600;
 const session={access_token:`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:user.id,email:user.email,exp:expires,role:'authenticated'})}.synthetic`,refresh_token:'synthetic-refresh',expires_at:expires,token_type:'bearer',user};
 const profile={id:user.id,display_name:'Synthetic Explorer',pronouns:'',avatar_id:'orbit',interests:['music'],onboarding_completed_at:'2026-10-07T12:00:00Z'};
 await page.addInitScript(session=>localStorage.setItem('kampuscape-auth',JSON.stringify(session)),session);
 await page.route('https://kampuscape-test.supabase.co/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/kampuscape_share_event')){const token=randomUUID();shareRecords.set(token,{...route.request().postDataJSON().p_event,host:{name:profile.display_name,avatar:profile.avatar_id},shareToken:token});return route.fulfill({json:token});}
  if(path.endsWith('/kampuscape_revoke_share'))return route.fulfill({json:null});
  // Attendance RPCs: nobody going yet, unless a test overrides this route.
  if(path.includes('/rest/v1/rpc/'))return route.fulfill({json:[]});
  // Community events table: empty unless a test overrides this route.
  if(path.endsWith('/kampuscape_community_events'))return route.fulfill(route.request().method()==='GET'?{json:[]}:{status:201,json:[]});
  if(path.endsWith('/settings'))return route.fulfill({json:{external:{email:true}}});
  if(path.endsWith('/user'))return route.fulfill({json:user});
  if(path.endsWith('/kampuscape_profiles'))return route.fulfill({json:[profile]});
  if(path.endsWith('/logout'))return route.fulfill({status:204});
  throw new Error(`Unexpected Auth fixture request ${path}`);
 });
}
