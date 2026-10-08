import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {installMember} from './tests/auth-fixture.mjs';
const S=process.env.S;const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:950}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await installMember(p);await p.clock.setFixedTime(new Date('2026-10-07T18:00:00Z'));
await ctx.route('**/api/campus-events',r=>r.fulfill({json:JSON.parse(readFileSync('public/campus-events.json'))}));
await ctx.route(/^https:\/\/(?!127\.0\.0\.1|kampuscape-test).*/,r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:'<h1>Synthetic</h1>'}):r.continue());
// Synthetic attendance backend: one other attendee already going.
const rows=new Map();let n=0;const others=key=>[{display_name:'Taylor Classmate',avatar_id:'sun',anonymous:false,is_you:false}];
await p.route('https://kampuscape-test.supabase.co/rest/v1/rpc/**',async r=>{const fn=r.request().url().split('/rpc/')[1];const a=r.request().postDataJSON()||{};
 if(fn==='kampuscape_attend'){const prev=rows.get(a.p_event_key);const name=a.p_mode==='profile'?'Synthetic Explorer':(prev?.anonymous?prev.display_name:['Quiet Otter','Brave Lynx','Sunny Heron'][n++%3]);const row={display_name:name,avatar_id:a.p_mode==='profile'?'orbit':'fox',anonymous:a.p_mode==='anonymous'};rows.set(a.p_event_key,row);return r.fulfill({json:[row]});}
 if(fn==='kampuscape_leave_event'){rows.delete(a.p_event_key);return r.fulfill({status:204});}
 if(fn==='kampuscape_event_attendees'){const list=[...others(),...(rows.has(a.p_event_key)?[{...rows.get(a.p_event_key),is_you:true}]:[])];return r.fulfill({json:list.map(x=>({...x,total:list.length}))});}
 if(fn==='kampuscape_my_attendance')return r.fulfill({json:[...rows].map(([k,v])=>({event_key:k,...v}))});
 return r.fulfill({status:404,json:{}});});
await p.goto('http://127.0.0.1:5173');await p.waitForTimeout(2000);
await p.getByRole('button',{name:'Live events',exact:true}).click();await p.getByRole('button',{name:'UIC',exact:true}).click();await p.waitForTimeout(400);
await p.locator('.event-map-title').first().click();await p.waitForTimeout(1200);
const card=p.locator('.event-map-detail');
await card.getByText('1 going').waitFor();
await card.getByRole('button',{name:'Anonymous'}).click();await card.getByText('2 going').waitFor();
const alias=await card.locator('.going-as strong').innerText();assert.notEqual(alias,'Synthetic Explorer');
await p.screenshot({path:S+'/att-card.png',clip:await card.boundingBox()});
await card.getByRole('button',{name:'My name'}).click();await card.locator('.going-as strong',{hasText:'Synthetic Explorer'}).waitFor();
await card.getByRole('button',{name:'Not going'}).click();await card.getByText('1 going').waitFor();
// Return-from-registration flow: choose anonymous, then toggle in My Events.
const link=card.getByRole('link',{name:'Details & registration'});const opened=ctx.waitForEvent('page');await link.click();const ext=await opened;await ext.waitForLoadState();
await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await ext.close();await p.bringToFront();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
const dlg=p.locator('.registration-dialog');await dlg.getByRole('button',{name:'Yes, I’m going'}).click();
await dlg.getByRole('radio',{name:/Anonymously/}).click();await p.screenshot({path:S+'/att-choice.png',clip:await dlg.boundingBox()});
await dlg.getByRole('button',{name:'I’m going'}).click();
const mine=p.locator('.drafts .going-as').first();await mine.getByText('(anonymous)').waitFor();
await p.screenshot({path:S+'/att-myevents.png',clip:await p.locator('.drafts .private-event-card').first().boundingBox()});
await mine.getByRole('button',{name:'My name'}).click();await mine.locator('strong',{hasText:'Synthetic Explorer'}).waitFor();
console.log('attendance flow ok | errors',errs);await b.close();
