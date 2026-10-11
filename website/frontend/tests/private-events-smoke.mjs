import {shareHtml} from '../server/eventShare.js';
import {installMember,TEST_USER_ID,installVisitDismissal,shareRecords} from './auth-fixture.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const feed=JSON.parse(readFileSync(new URL('../public/campus-events.json',import.meta.url)));
const browser=await chromium.launch({headless:true});
const errors=[];
async function setup(options={}){
 const context=await browser.newContext(options);await context.grantPermissions(['clipboard-read','clipboard-write']);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&/expression|fill-extrusion|within/.test(e.text()))errors.push(e.text());});
 await installVisitDismissal(page);
 await page.route('**/rest/v1/rpc/kampuscape_shared_event',r=>r.fulfill({json:shareRecords.get(r.request().postDataJSON().p_token)||null}));
 await page.route('**/uic/share/*',r=>{const token=new URL(r.request().url()).pathname.split('/').at(-1);return r.fulfill({contentType:'text/html',body:shareHtml(shareRecords.get(token),new URL(r.request().url()).origin,token)});});
 await page.clock.setFixedTime(new Date('2026-10-05T18:00:00Z'));
 await page.route('**/api/campus-events',r=>r.fulfill({json:feed}));return page;
}
async function pinBuilding(page,expected){
 assert.equal(await page.locator('dialog[open]').count(),0,'map pin UI appears before onboarding');
 await page.getByRole('region',{name:'Pin event location'}).waitFor();
 assert.match(await page.locator('.maplibregl-canvas').evaluate(el=>getComputedStyle(el).cursor),/map-pin-cursor|data:image\/svg/,'pin-shaped cursor is active');
 let id='';
 for(let y=400;y<620;y+=35){for(let x=650;x<820;x+=35){
  await page.mouse.click(x,y);await page.waitForTimeout(180);id=await page.locator('.map').getAttribute('data-preview-venue');
  if(id&&(!expected||id===expected))break;
 }if(id&&(!expected||id===expected))break;}
 assert.ok(id&&(!expected||id===expected),'building pin has an immediate yellow preview');
 assert.equal(await page.locator('dialog[open]').count(),0,'yellow preview precedes onboarding');
 assert.equal(await page.locator('.event-pin-preview').count(),1);
 await page.waitForTimeout(600);await page.screenshot({path:'artifacts/private-pin-preview.png'});
 await page.getByRole('region',{name:'Pin event location'}).getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('.create-event-dialog[open]').waitFor();
 return id;
}
const page=await setup({viewport:{width:1440,height:1000}});
await installMember(page);
try{
 await page.goto((process.env.TEST_APP_URL||'http://127.0.0.1:5173'));
 await page.locator('.map-status').waitFor({state:'detached',timeout:30000});
 assert.equal(await page.locator('vite-error-overlay').count(),0);
 assert.match(await page.getByRole('group',{name:'Map legend'}).innerText(),/UIC Building[\s\S]*Off-campus places & events[\s\S]*Private Events/);
 await page.getByRole('button',{name:/events available/}).click();await page.getByRole('group',{name:'Event categories'}).getByRole('button',{name:'UIC',exact:true}).click();await page.getByRole('searchbox',{name:'Search UIC events'}).fill('Andersen Firm Night');await page.getByRole('button',{name:'Show Andersen Firm Night on map',exact:true}).click();await page.waitForTimeout(1200);
 await page.getByRole('button',{name:'Create event',exact:true}).click();await page.getByRole('region',{name:'Pin event location'}).getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('.create-event-dialog').count(),0);
 await page.getByRole('button',{name:'Create event',exact:true}).click();
 assert.equal(await page.locator('.wizard-steps').count(),0);
 assert.equal(await page.getByLabel('Event name',{exact:true}).count(),0,'building comes before event details');
 await page.screenshot({path:'artifacts/private-building-first.png'});
 await pinBuilding(page,'uic-0605');
 await page.getByRole('region',{name:'Existing events in this building'}).getByRole('button',{name:'Choose Andersen Firm Night',exact:true}).click();
 await page.getByRole('region',{name:'Selected event on map'}).waitFor();
 assert.equal(await page.locator('.create-event-dialog').count(),0,'choosing existing event exits setup');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kampuscape-drafts:00000000-0000-0000-0000-000000000001')).length),0);
 await page.getByRole('button',{name:'Create event',exact:true}).click();
 await pinBuilding(page,'uic-0605');
 await page.screenshot({path:'artifacts/private-existing-events.png'});
 await page.getByRole('button',{name:'Create a new event',exact:true}).click();
 await page.getByLabel('Event name',{exact:true}).fill('Synthetic dinner test');
 await page.getByLabel('Date',{exact:true}).fill('2026-12-20');await page.getByLabel('Time',{exact:true}).fill('18:00');
 await page.screenshot({path:'artifacts/private-onboarding.png'});
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.screenshot({path:'artifacts/private-review.png'});
 await page.getByRole('radio',{name:/^Private/}).click();await page.getByRole('button',{name:'Create private event',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.map').dataset.privateVenues?.includes('uic-0605'));
 await page.waitForTimeout(1300);
 const detail=page.getByRole('region',{name:'Selected event on map'});
 assert.match(await detail.innerText(),/Synthetic dinner test/);
 assert.equal(await page.locator('.private-building-marker').count(),1);
 await page.waitForTimeout(2200);await page.screenshot({path:'artifacts/private-event-building.png'});
 await detail.getByRole('button',{name:'Share Synthetic dinner test'}).click();
 await page.getByLabel('Event link').waitFor();assert.equal(await page.title(),'Synthetic dinner test');assert.equal(await page.locator('dialog[open] h2').innerText(),'Synthetic dinner test');assert.doesNotMatch(await page.locator('dialog[open]').innerText(),/SEND A PLAN|Meet me here|This link opens|Deleting your local event/);await page.screenshot({path:'artifacts/private-share.png'});
 const link=await page.getByLabel('Event link',{exact:true}).inputValue();assert.ok(link.includes('/uic/share/'));
 await page.getByRole('button',{name:'Copy link',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),link);
 await page.getByRole('button',{name:'Close share'}).click();
 const recipient=await setup({viewport:{width:390,height:844}});await recipient.goto(link);await recipient.getByRole('link',{name:'Open event on the map →'}).click();
 await recipient.getByRole('region',{name:'Selected event on map'}).waitFor();await recipient.waitForTimeout(1600);
 assert.equal(await recipient.title(),'Synthetic dinner test');
 const pose=JSON.parse(await recipient.locator('.map').getAttribute('data-camera'));
 assert.ok(Math.abs(pose.center[0]+87.647964)<.00001&&Math.abs(pose.center[1]-41.871967)<.00001,'fresh recipient opens exact building');
 assert.equal(await recipient.evaluate(()=>JSON.parse(localStorage.getItem('kampuscape-drafts')).length),0,'shared event does not silently become an owned event');
 assert.equal(await recipient.getByRole('button',{name:'Delete event',exact:true}).count(),0);
 assert.ok(await recipient.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.ok(await recipient.evaluate(()=>{const a=document.querySelector('.event-count-pill').getBoundingClientRect(),b=document.querySelector('.profile').getBoundingClientRect();return a.right<b.left;}),'event counter clears mobile profile');await recipient.screenshot({path:'artifacts/private-shared-mobile.png'});
 await recipient.getByRole('button',{name:'Remove from map',exact:true}).click();
 await recipient.waitForFunction(()=>document.querySelector('.map').dataset.privateVenues==='[]');assert.ok(!recipient.url().includes('#event='));
 await page.reload();await page.getByRole('button',{name:'My Events',exact:true}).click();
 await page.getByRole('button',{name:'Synthetic dinner test',exact:true}).click();await page.getByRole('button',{name:'Delete event',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.map').dataset.privateVenues==='[]');
 await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kampuscape-drafts:00000000-0000-0000-0000-000000000001')).length),0);
 // Pick a real roof directly, preserving form values across the map step.
 await page.locator('.map-status').waitFor({state:'detached',timeout:30000});
 await page.getByRole('button',{name:'Create event',exact:true}).click();
 await pinBuilding(page);await page.getByRole('button',{name:'Create a new event',exact:true}).click();
 await page.getByLabel('Event name',{exact:true}).fill('Synthetic map pin test');await page.getByLabel('Date',{exact:true}).fill('2026-12-21');await page.getByLabel('Time',{exact:true}).fill('17:00');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('radio',{name:/^Private/}).click();await page.getByRole('button',{name:'Create private event',exact:true}).click();await page.waitForTimeout(1000);
 assert.match(await detail.innerText(),/Synthetic map pin test/);await page.waitForTimeout(2700);await page.screenshot({path:'artifacts/private-pinned-building.png'});console.log('Picked venue:',await page.evaluate(()=>JSON.parse(localStorage.getItem('kampuscape-drafts:00000000-0000-0000-0000-000000000001')).at(-1).venue.id));
 // Public and hidden-location events both expose working share links.
 await page.getByRole('button',{name:'Live events',exact:true}).click();await page.getByRole('group',{name:'Event categories'}).getByRole('button',{name:'UIC',exact:true}).click();
 const card=page.locator('.campus-event-card').filter({has:page.getByRole('button',{name:'Share Andersen Firm Night',exact:true})});await card.getByRole('button',{name:'Share Andersen Firm Night',exact:true}).click();
 await page.locator('dialog[open]').getByLabel('Event link',{exact:true}).click();const publicLink=await page.locator('dialog[open]').getByLabel('Event link',{exact:true}).inputValue();
 await recipient.goto(publicLink);await recipient.waitForTimeout(1600);assert.match(await recipient.getByRole('region',{name:'Selected event on map'}).innerText(),/Andersen Firm Night/);
 assert.equal(await recipient.locator('.map').getAttribute('data-focused-event-venue'),'uic-0605');
 // On phones an open event card hides the bottom nav; close it first.
 await recipient.getByRole('button',{name:'Close event on map'}).click();
 // Guests must sign in before creating events (A25); the account dialog opens instead of pin mode.
 await recipient.getByRole('button',{name:'Create event',exact:true}).click();
 await recipient.locator('.account-dialog[open]').waitFor();
 assert.equal(await recipient.locator('.map').getAttribute('data-preview-venue')||'','','no pin mode for guests');
 await recipient.getByRole('button',{name:'Close account'}).click();
 assert.equal(await recipient.locator('dialog[open]').count(),0);
 assert.equal(await recipient.evaluate(()=>JSON.parse(localStorage.getItem('kampuscape-drafts')).length),0);
 await recipient.goto((process.env.TEST_APP_URL||'http://127.0.0.1:5173')+'/#event=invalid');await recipient.getByRole('status').filter({hasText:'invalid or incomplete'}).waitFor();
 assert.deepEqual(errors,[]);console.log('Private events: onboarding, real map picking, persistence, sharing to a fresh mobile browser, exact camera, deletion, public links and malformed links passed.');
}finally{await browser.close();}
