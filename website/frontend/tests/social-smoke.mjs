// Synthetic two-member transport: no real messages, users or share records.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const url=process.env.TEST_APP_URL||'http://127.0.0.1:5174';
const browser=await chromium.launch({headless:true}),errors=[];
const id=n=>`00000000-0000-0000-0000-00000000000${n}`;
const token='11111111-1111-4111-8111-111111111111',contact=id(9),tid=id(8);
const event={id:token,title:'Synthetic jazz meetup',source:'Private event',visibility:'public',date:'2026-10-12',time:'18:30',description:'Synthetic test event.',venue:{id:'uic-0605',name:'Student Center East',coords:[-87.647964,41.871967]},host:{name:'Alex Member',avatar:'fox'},shareToken:token};
const feed=JSON.parse(readFileSync(new URL('../public/campus-events.json',import.meta.url)));
let thread=null,messages=[],shareCalls=0,revoked=false;
const inbox=who=>thread?[{id:tid,event_title:event.title,display_name:who===1?'Quiet Fox':'Alex Member',avatar_id:'fox',your_name:who===1?'Alex Member':'Quiet Fox',status:thread.status,incoming:who===2,blocked:thread.blocked,blocked_by_you:thread.blocked&&who===2,unread:messages.filter(m=>m.sender!==who).length,updated_at:new Date().toISOString()}]:[];
async function pageFor(who,{mobile=false,guide=false}={}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-10T18:00:00Z'));
 if(!guide)await page.addInitScript(()=>localStorage.setItem('kampuscape-guide-v1','done'));
 if(who){
  const user={id:id(who),email:`synthetic${who}@uic.edu`,email_confirmed_at:'2026-10-10T12:00:00Z',aud:'authenticated',role:'authenticated',created_at:'2026-10-10T12:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],is_anonymous:false};
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),expires=Math.floor(Date.now()/1000)+3600;
  const session={access_token:`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:user.id,email:user.email,exp:expires,role:'authenticated'})}.synthetic`,refresh_token:'synthetic-refresh',expires_at:expires,token_type:'bearer',user};
  await page.addInitScript(({session,draft})=>{localStorage.setItem('kampuscape-auth',JSON.stringify(session));if(draft&&!localStorage.getItem(`kampuscape-drafts:${session.user.id}`))localStorage.setItem(`kampuscape-drafts:${session.user.id}`,JSON.stringify([draft]));},{session,draft:who===1?{...event,visibility:undefined,shareToken:undefined}:null});
  await page.route('https://kampuscape-test.supabase.co/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname,body=req.method()==='POST'?req.postDataJSON():{};
   if(path.endsWith('/user'))return route.fulfill({json:user});
   if(path.endsWith('/kampuscape_profiles'))return route.fulfill({json:[{id:user.id,display_name:who===1?'Alex Member':'Sam Member',avatar_id:'fox',interests:['music'],onboarding_completed_at:'2026-10-10T12:00:00Z'}]});
   if(path.endsWith('/kampuscape_public_events'))return route.fulfill({json:[{...event,shareToken:undefined,host_name:'Alex Member',host_avatar:'fox'}]});
   if(path.endsWith('/kampuscape_shared_event'))return route.fulfill({json:revoked?null:event});
   if(path.endsWith('/kampuscape_share_event')){shareCalls++;assert.equal(body.p_event.title,event.title);return route.fulfill({json:token});}
   if(path.endsWith('/kampuscape_revoke_share')){revoked=true;return route.fulfill({json:null});}
   if(path.endsWith('/kampuscape_event_contacts'))return route.fulfill({json:[{display_name:'Quiet Fox',avatar_id:'fox',anonymous:true,is_you:who===2,total:1,contact_id:who===1?contact:null}]});
   if(path.endsWith('/kampuscape_my_attendance'))return route.fulfill({json:[]});
   if(path.endsWith('/kampuscape_message_inbox'))return route.fulfill({json:inbox(who)});
   if(path.endsWith('/kampuscape_request_message')){assert.equal(body.p_contact_id,contact);thread||={status:'pending',blocked:false};return route.fulfill({json:tid});}
   if(path.endsWith('/kampuscape_message_action')){if(body.p_action==='accept'){assert.equal(who,2);thread.status='accepted';}if(body.p_action==='decline')thread.status='declined';if(body.p_action==='block')thread.blocked=true;if(body.p_action==='unblock')thread.blocked=false;return route.fulfill({json:null});}
   if(path.endsWith('/kampuscape_message_history'))return route.fulfill({json:messages.map(m=>({id:m.id,body:m.body,is_you:m.sender===who,created_at:m.created_at})).reverse()});
   if(path.endsWith('/kampuscape_send_message')){assert.equal(thread.status,'accepted');assert.equal(thread.blocked,false);messages.push({id:messages.length+1,body:body.p_body,sender:who,created_at:new Date().toISOString()});return route.fulfill({json:messages.length});}
   if(path.endsWith('/logout'))return route.fulfill({status:204});
   throw new Error(`Unexpected RPC ${path}`);
  });
 }else await page.route('https://kampuscape-test.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.route('**/api/campus-events',r=>r.fulfill({json:feed}));
 return page;
}
try{
 const guest=await pageFor(null,{guide:true});await guest.goto(url,{waitUntil:'domcontentloaded'});
 await guest.getByRole('heading',{name:'A map for your next plan.'}).waitFor();assert.equal(await guest.locator('.guide-card').count(),8);
 await guest.screenshot({path:'/tmp/kampuscape-guide-desktop.png'});
 await guest.getByRole('button',{name:/Live events See what’s happening/}).click();await guest.getByRole('group',{name:'Event categories'}).waitFor();
 assert.equal(await guest.evaluate(()=>localStorage.getItem('kampuscape-guide-v1')),'done');
 await guest.getByRole('button',{name:'How it works'}).click();await guest.getByRole('button',{name:'Close guide'}).click();
 const sender=await pageFor(1);await sender.goto(url,{waitUntil:'domcontentloaded'});
 await sender.getByRole('heading',{name:'What’s happening around you.'}).waitFor();await sender.screenshot({path:'/tmp/kampuscape-recommendations-desktop.png'});
 await sender.locator('.happening-list').getByRole('button',{name:/Synthetic jazz meetup/}).click();
 await sender.locator('.event-map-detail').getByRole('button',{name:'Share Synthetic jazz meetup'}).click();
 await sender.getByLabel('Event link').waitFor();assert.match(await sender.getByLabel('Event link').inputValue(),/\/uic\/share\//);assert.ok(shareCalls>0);assert.equal(await sender.locator('.share-dialog').getByText(/Hosted by Alex Member/).count(),1);
 await sender.getByRole('button',{name:'Close share'}).click();
 await sender.locator('.going-pill').click();await sender.getByRole('button',{name:'Message Quiet Fox'}).click();
 await sender.getByRole('button',{name:'Send message request',exact:true}).click();await sender.getByRole('heading',{name:'Request sent'}).waitFor();assert.equal(await sender.getByLabel('Message',{exact:true}).count(),0);
 const receiver=await pageFor(2,{mobile:true});await receiver.goto(url,{waitUntil:'domcontentloaded'});await receiver.getByRole('button',{name:'Close recommendations'}).click();
 await receiver.getByRole('button',{name:'Open messages'}).click();await receiver.locator('.message-inbox').getByRole('button',{name:/Alex Member/}).click();
 await receiver.getByRole('button',{name:'Accept request'}).waitFor();await receiver.screenshot({path:'/tmp/kampuscape-message-request-mobile.png'});
 await receiver.getByRole('button',{name:'Accept request'}).click();await receiver.getByLabel('Message',{exact:true}).waitFor();
 await sender.getByRole('button',{name:'Close messages'}).click();await sender.getByRole('button',{name:'Open messages'}).click();await sender.locator('.message-inbox').getByRole('button',{name:/Quiet Fox/}).click();
 await sender.getByLabel('Message',{exact:true}).fill('Hello! See you at the jazz meetup.');await sender.getByRole('button',{name:'Send message',exact:true}).click();await sender.getByText('Hello! See you at the jazz meetup.',{exact:true}).waitFor();
 await receiver.getByRole('button',{name:'Close messages'}).click();await receiver.getByRole('button',{name:'Open messages'}).click();await receiver.locator('.message-inbox').getByRole('button',{name:/Alex Member/}).click();await receiver.getByText('Hello! See you at the jazz meetup.',{exact:true}).waitFor();
 await receiver.screenshot({path:'/tmp/kampuscape-chat-mobile.png'});
 await receiver.getByRole('button',{name:'Block this person'}).click();await receiver.getByRole('button',{name:'Unblock person'}).waitFor();assert.equal(await receiver.getByLabel('Message',{exact:true}).count(),0);
 await sender.getByRole('button',{name:'Close messages'}).click();await sender.getByRole('button',{name:'Open messages'}).click();await sender.locator('.message-inbox').getByRole('button',{name:/Quiet Fox/}).click();await sender.getByText('This conversation is unavailable.',{exact:true}).waitFor();assert.equal(await sender.getByLabel('Message',{exact:true}).count(),0);
 await sender.getByRole('button',{name:'Close messages'}).click();await sender.reload({waitUntil:'domcontentloaded'});await sender.getByRole('heading',{name:'What’s happening around you.'}).waitFor();
 await sender.getByRole('button',{name:'Close recommendations'}).click();await sender.getByRole('button',{name:'My Events',exact:false}).first().click();const revokedResponse=sender.waitForResponse(r=>r.url().endsWith('/kampuscape_revoke_share'));await sender.getByRole('button',{name:'Delete Synthetic jazz meetup',exact:true}).click();await revokedResponse;assert.equal(revoked,true);
 const phoneGuide=await pageFor(null,{mobile:true,guide:true});await phoneGuide.goto(url,{waitUntil:'domcontentloaded'});await phoneGuide.getByRole('heading',{name:'A map for your next plan.'}).waitFor();await phoneGuide.screenshot({path:'/tmp/kampuscape-guide-mobile.png'});
 assert.ok(await phoneGuide.locator('.guide-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.deepEqual(errors,[]);
 console.log('Social browser checks passed: clickable guide, per-visit recommendations, persisted rich share URL, request/accept/chat/block across two users, mobile layout and share revocation.');
}finally{await browser.close();}
