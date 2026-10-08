import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.clock.setFixedTime(new Date('2026-10-07T18:00:00Z'));
await context.route('**/api/campus-events',r=>r.fulfill({json:JSON.parse(readFileSync(new URL('../public/campus-events.json',import.meta.url)))}));
// Synthetic external page: no registration/submission occurs in this test.
await context.route('https://uic.campusgroups.com/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Synthetic registration page</h1>'}));
await context.route('https://www.lpzoo.org/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Synthetic registration page</h1>'}));
const dialog=page.getByRole('dialog',{name:'Did you register?'});
async function returnFrom(link){
 const opened=context.waitForEvent('page');await link.click();const external=await opened;
 await external.waitForLoadState();
 assert.equal(await dialog.count(),0,'no prompt immediately on click');
 // Headless Chrome keeps tabs notionally focused; simulate native departure/return signals.
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await external.close();await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
}
try{
 await page.goto('http://127.0.0.1:5173');await page.getByRole('button',{name:'Live events',exact:true}).click();
 const link=page.getByRole('link',{name:'Details & registration',exact:true}).first();
 const title=await link.locator('xpath=ancestor::article').locator('h3').innerText();
 await returnFrom(link);await dialog.waitFor();assert.ok((await dialog.innerText()).includes(title));
 await dialog.getByRole('button',{name:'Not now'}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('afterclass-registered-events')||'[]').length),0);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(250);assert.equal(await dialog.count(),0);
 await returnFrom(link);await dialog.getByRole('button',{name:'Add to My Events'}).click();
 await page.locator('.drafts').waitFor();assert.ok((await page.locator('.drafts').innerText()).includes(title));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('afterclass-registered-events')).length),1);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('afterclass-drafts')||'[]').length),0);
 await returnFrom(page.locator('.drafts').getByRole('link',{name:'Details & registration'}));await page.waitForTimeout(250);assert.equal(await dialog.count(),0);
 await page.reload();await page.getByRole('button',{name:'My Events',exact:true}).click();assert.ok((await page.locator('.drafts').innerText()).includes(title));
 await page.getByRole('button',{name:`Remove ${title} from My Events`,exact:true}).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('afterclass-registered-events')).length),0);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Live events',exact:true}).click();
 await returnFrom(page.getByRole('link',{name:'Details & registration',exact:true}).first());await dialog.waitFor();
 assert.ok(await dialog.evaluate(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight;}));
 await page.screenshot({path:'/tmp/uic-registration-return-mobile.png'});
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
 // Check the exact map-detail path from the request, including a reload while away.
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Off-campus',exact:true}).click();
 await page.getByRole('button',{name:'Show Fall Fest on map',exact:true}).click();
 const opened=context.waitForEvent('page');
 await page.getByRole('region',{name:'Selected event on map'}).getByRole('link',{name:'Details & registration'}).click();
 const external=await opened;await external.waitForLoadState();
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await page.reload();await external.close();await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await dialog.waitFor();assert.match(await dialog.innerText(),/Fall Fest/);
 await page.screenshot({path:'/tmp/uic-registration-return-desktop.png'});
 await dialog.getByRole('button',{name:'Add to My Events'}).click();
 await page.locator('.drafts').getByRole('button',{name:'Fall Fest',exact:true}).click();
 await page.getByRole('region',{name:'Selected event on map'}).getByRole('button',{name:'My Events',exact:true}).click();
 assert.match(await page.locator('.drafts').innerText(),/Fall Fest/);
 assert.deepEqual(errors,[]);console.log('Registration return: departure/return, dismiss, add, duplicates, persistence, remove and mobile passed.');
}finally{await browser.close();}
