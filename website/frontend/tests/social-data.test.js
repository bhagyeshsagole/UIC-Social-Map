import test from 'node:test';
import assert from 'node:assert/strict';
import {createResource} from '../src/liveResource.js';
import {serveFeed,FRESH_MS} from '../server/feedCache.js';
import {shareHtml,shareSvg,sharedEvent} from '../server/eventShare.js';
import {visitRecommendations} from '../src/visitRecommendations.js';

test('shared resources deduplicate loads, keep last good data and discard cleared-session responses',async()=>{
 let calls=0,resolve,fail=false;
 const resource=createResource(()=>{calls++;return fail?Promise.reject(new Error('offline')):new Promise(r=>resolve=r);});
 const first=resource.refresh();const second=resource.refresh();await Promise.resolve();assert.equal(calls,1);resolve(['good']);await Promise.all([first,second]);
 fail=true;await resource.refresh({force:true});assert.deepEqual(resource.getSnapshot().data,['good']);assert.match(resource.getSnapshot().error.message,/offline/);
 fail=false;const old=resource.refresh({force:true});await Promise.resolve();resource.clear();resolve(['old-user']);await old;assert.equal(resource.getSnapshot().data,undefined);
});
test('edge cache serves last good data immediately and refreshes stale data in the background',async()=>{
 const now=Date.now(),old={schemaVersion:1,events:[],fetchedAt:new Date(now-FRESH_MS-1000).toISOString()};let loads=0;const jobs=[];
 const response=await serveFeed({request:new Request('https://kampuscape.com/uic/api/campus-events'),month:'2026-10',now,env:{},waitUntil:p=>jobs.push(p),cache:{match:async()=>Response.json(old),put:async()=>{}},load:async()=>{loads++;throw new Error('upstream down');}});
 assert.equal(response.status,200);assert.equal(response.headers.get('X-Kampuscape-Cache'),'stale');assert.deepEqual(await response.json(),old);await Promise.all(jobs);assert.equal(loads,1);
});
test('share previews contain host/date/time/PNG metadata and escape untrusted event text',()=>{
 const event={id:'x',title:'<script>alert("x")</script>',host:{name:'Alex & Sam'},date:'2026-10-15',time:'18:30',venue:{name:'Test Hall',coords:[-87,41]},description:'<img onerror=alert(1)>'};
 const html=shareHtml(event,'https://kampuscape.com','token');assert.match(html,/og:image:type" content="image\/png/);assert.match(html,/Alex &amp; Sam/);assert.match(html,/Oct 15, 2026/);assert.match(html,/18:30 Chicago time/);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img onerror'));
 const svg=shareSvg(event);assert.match(svg,/width="1200" height="630"/);assert.ok(!svg.includes('<script>'));
});
test('invalid share tokens never contact the database',async()=>{assert.equal(await sharedEvent('../bad',{},()=>assert.fail()),null);});
test('visit recommendations exclude expired entries, deduplicate, and include upcoming fallback events',()=>{
 const now=new Date('2026-10-10T18:00:00Z');const events=[{id:'old',title:'Old music',end:'2026-10-09'},{id:'a',title:'Jazz meetup',start:'2026-10-11',end:'2026-10-12'},{id:'b',title:'Campus gathering',date:'2026-10-13',time:'12:00'}];
 assert.deepEqual(visitRecommendations([...events,events[1]],['music'],now).map(x=>x.event.id),['a','b']);
 assert.equal(visitRecommendations(events,[],now).length,2);
});
