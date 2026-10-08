import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installMember,TEST_USER_ID} from './auth-fixture.mjs';
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || undefined});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let mode='named';
// Creating events requires a signed-in member; the fixture fakes one (no real accounts).
await installMember(page);
await page.route('**/api/campus-events',r=>r.fulfill({json:JSON.parse(readFileSync(new URL('../public/campus-events.json',import.meta.url)))}));
// The fast reverse lookup finds nothing here, so the synthetic Overpass response decides.
await page.route('**/reverse?**',r=>r.fulfill({json:{error:'Unable to geocode'}}));
// Synthetic API responses for the selected roof; never published map content.
await page.route('**/api/interpreter',async r=>{
 if(mode==='offline')return r.abort();
 const query=new URLSearchParams(r.request().postData()).get('data');
 const [s,w,n,e]=query.match(/way\[building\]\(([^)]+)\)/)[1].split(',').map(Number);
 await r.fulfill({json:{elements:[{type:'way',tags:{building:'yes',...(mode==='named'?{name:'Synthetic Test Hall'}:{}),'addr:full':'123 Synthetic Street'},geometry:[[w,s],[e,s],[e,n],[w,n],[w,s]].map(([lon,lat])=>({lon,lat}))}]}});
});
try{
 for(const scenario of ['named','address','offline']){
  mode=scenario;await page.goto(process.env.TEST_APP_URL||'http://127.0.0.1:5173');
  // Independent scenarios: a roof with a saved event reuses its saved name, so start each with no drafts.
  await page.evaluate(id=>localStorage.removeItem(`kampuscape-drafts:${id}`),TEST_USER_ID);await page.reload();
  await page.locator('.map-status').waitFor({state:'detached',timeout:30000});
  await page.getByRole('button',{name:'Create event',exact:true}).click();
  let selected=false;
  for(let y=360;y<700&&!selected;y+=35)for(let x=450;x<1050&&!selected;x+=35){
   await page.mouse.click(x,y);await page.waitForTimeout(50);
   selected=(await page.locator('.map').getAttribute('data-preview-venue')||'').startsWith('pin:');
  }
  assert.ok(selected,'found unregistered roof');
  await page.getByRole('region',{name:'Pin event location'}).getByRole('button',{name:'Continue',exact:true}).click({timeout:15000});
  const input=page.getByLabel('Building name or address',{exact:true});
  assert.equal(await input.inputValue(),scenario==='named'?'Synthetic Test Hall':scenario==='address'?'123 Synthetic Street':'');
  if(scenario==='offline'){
   assert.equal(await page.getByRole('button',{name:'Create a new event',exact:true}).isEnabled(),false);
   await input.fill('Synthetic manual location');
  }else assert.match(await page.locator('.chosen-building').innerText(),/123 Synthetic Street/);
  await page.getByRole('button',{name:'Create a new event',exact:true}).click();
  await page.getByLabel('Event name',{exact:true}).fill('Synthetic regression');
  await page.getByLabel('Date',{exact:true}).fill('2027-12-20');
  await page.getByLabel('Time',{exact:true}).fill('18:00');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Create private event',exact:true}).click();
  // Signed-in members' drafts are stored per user (A25).
  const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem(`kampuscape-drafts:${id}`)).at(-1),TEST_USER_ID);
  assert.equal(saved.venue.name,scenario==='named'?'Synthetic Test Hall':scenario==='address'?'123 Synthetic Street':'Synthetic manual location');
  await page.evaluate(()=>localStorage.removeItem('afterclass-drafts'));
 }
 assert.deepEqual(errors,[]);console.log('Building lookup: name, address fallback, persistence, offline and manual entry passed.');
}finally{await browser.close();}
