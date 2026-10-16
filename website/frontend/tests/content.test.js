import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parsePlaces} from '../src/content.js';
import {details} from '../src/placeDetails.js';
import {solarState,openingStatus,currentEvents,chicagoDate,directions} from '../src/time.js';
const copy=readFileSync(new URL('../../../added_sites.md',import.meta.url),'utf8');
test('every editable place has a unique stable metadata record',()=>{const places=parsePlaces(copy);assert.equal(places.length,87);for(const p of places){assert.ok(details[p.id]);assert.ok(p.name&&p.description);assert.ok(details[p.id].sources.length);}});
test('editing markdown changes display copy without changing saved identity',()=>{const revised=parsePlaces(copy.replace('## Busy Burger','## A new name').replace('Burgers, hand-cut fries, and shakes on Taylor Street.','A new description.'));assert.equal(revised.find(p=>p.id==='busy-burger').name,'A new name');assert.match(revised.find(p=>p.id==='busy-burger').description,/A new description/);assert.match(directions({...details['busy-burger'],...revised.find(p=>p.id==='busy-burger')}),/A%20new%20name/);});
test('solar theme follows Chicago sunrise and sunset across seasons',()=>{for(const d of ['2026-01-15','2026-07-15','2026-11-01']){const noon=solarState(new Date(`${d}T18:00:00Z`));assert.equal(noon.night,false);assert.equal(solarState(new Date(+noon.sunrise-1000)).night,true);assert.equal(solarState(new Date(+noon.sunrise+1000)).night,false);assert.equal(solarState(new Date(+noon.sunset+1000)).night,true);}});
test('Chicago date and hours are independent of visitor timezone',()=>{assert.equal(chicagoDate(new Date('2026-10-05T02:00:00Z')),'2026-10-04');assert.equal(openingStatus(details['busy-burger'],new Date('2026-10-05T04:59:00Z')).open,true);assert.equal(openingStatus(details['busy-burger'],new Date('2026-10-05T05:01:00Z')).open,false);assert.equal(openingStatus(details['gallery-400'],new Date('2026-10-04T18:00:00Z')).open,false);});
test('expired exhibitions disappear',()=>{assert.equal(currentEvents(details['gallery-400'],new Date('2026-10-04T18:00:00Z')).length,1);assert.equal(currentEvents(details['gallery-400'],new Date('2026-12-13T18:00:00Z')).length,0);});

import {touchCamera,touchFrame} from '../src/gestures.js';
test('two-finger translation preserves orientation while twist and pinch change rotation and zoom',()=>{
 const camera={pitch:54,bearing:0,zoom:15};
 const previous=touchFrame([{clientX:100,clientY:100},{clientX:200,clientY:100}]);
 const down=touchFrame([{clientX:100,clientY:300},{clientX:200,clientY:300}]);
 const translated=touchCamera(camera,previous,down);
 assert.equal(translated.bearing,0);assert.equal(translated.zoom,15);
 assert.equal(translated.pitch,undefined,'Translation must not tilt the camera');
 assert.equal(touchCamera(camera,previous,{...previous,angle:-25}).bearing,25);
 assert.equal(touchCamera(camera,previous,{...previous,distance:200}).zoom,16);
});
import {buildIndex,searchIndex,shortDate} from '../src/search.js';
test('spotlight searches places, saved places, events, plans, menus, and activities together',()=>{
 const places=parsePlaces(copy).map(p=>({...details[p.id],...p}));
 const now=new Date('2026-10-04T18:00:00Z');
 const events=places.flatMap(p=>currentEvents(p,now).map(e=>({...e,place:p})));
 const items=buildIndex({places,saved:['busy-burger'],drafts:[{id:'d1',title:'Burger break',placeId:'busy-burger',date:'2026-12-20',time:'17:30'}],events,categories:['Arts & culture','Cafes']});
 const groups=q=>Object.fromEntries(searchIndex(items,q).map(g=>[g.group,g.items.map(i=>i.title)]));
 assert.deepEqual(groups('burger').Saved,['Busy Burger']);
 assert.deepEqual(groups('burger')['My Events'],['Burger break']);
 assert.ok(groups('burger').Menu.includes('Impossible Burger'));
 assert.ok(!(groups('burger').Places||[]).includes('Busy Burger'),'saved places are not duplicated');
 assert.deepEqual(groups('cassatt').Events,['Mary Cassatt: After Impressionism']);
 assert.ok(groups('halal').Places.includes('Cairo Kebab'));
 assert.deepEqual(groups('cafes').Activities,['Cafes']);
 assert.deepEqual(groups('koshary egyptian').Menu,['Koshary']);
 assert.deepEqual(searchIndex(items,'zzzz'),[]);
 const idle=searchIndex(items,'').map(g=>g.group);assert.ok(idle.includes('Saved')&&idle.includes('Events')&&!idle.includes('Places'));
 assert.equal(shortDate('2027-01-03'),'Jan 3, 2027');
});
test('every place has a local, credited photo',()=>{for(const [id,d] of Object.entries(details)){assert.ok(d.photo?.file&&d.photo.alt&&d.photo.credit&&d.photo.href,id);assert.ok(readFileSync(new URL(`../public/places/${d.photo.file}`,import.meta.url)).length>20000,id);}});
import {dayHours,weekHours,formatMinutes,chicagoDay} from '../src/time.js';
test('daily hours read from the weekly schedule in Chicago time',()=>{
 assert.equal(formatMinutes(720),'noon');assert.equal(formatMinutes(1440),'midnight');assert.equal(formatMinutes(390),'6:30am');
 assert.equal(dayHours(details['gallery-400'],6),'noon–5pm');assert.equal(dayHours(details['gallery-400'],1),'Closed');
 assert.equal(dayHours(details['art-institute'],4),'11am–8pm');assert.equal(dayHours(details['three-run-two'],2),'Meetup · 6:30pm');
 assert.deepEqual(weekHours(details['busy-burger']).map(d=>d.day).slice(0,2),['Monday','Tuesday']);
 assert.equal(chicagoDay(new Date('2026-10-05T03:00:00Z')),0,'Sunday evening in Chicago');
});
import {DIET,DIET_STATUS,servesFood} from '../src/diet.js';
test('every food place states all five diet facts with a valid status',()=>{for(const [id,d] of Object.entries(details)){if(!servesFood(d))continue;assert.ok(d.diet,id);for(const [key] of DIET)assert.ok(d.diet[key] in DIET_STATUS,`${id}.${key}`);}});
test('places stay within 6 miles of UIC east campus',()=>{for(const [id,{coords:[lon,lat]}] of Object.entries(details)){const mi=Math.hypot((lon+87.6475)*Math.cos(41.8719*Math.PI/180)*69.17,(lat-41.8719)*69.17);assert.ok(mi<=6,`${id} is ${mi.toFixed(2)} mi`);}});
test('diet words make places searchable',()=>{const places=parsePlaces(copy).map(p=>({...details[p.id],...p}));const g=Object.fromEntries(searchIndex(buildIndex({places}),'halal').map(x=>[x.group,x.items.map(i=>i.title)]));assert.ok(g.Places.includes('Cairo Kebab')&&g.Places.includes('Ghareeb Nawaz'));});
test('late-night hours stay open past midnight',()=>{assert.equal(openingStatus(details['papa-johns'],new Date('2026-10-05T07:30:00Z')).open,true,'2:30am Chicago');assert.equal(openingStatus(details['papa-johns'],new Date('2026-10-05T09:30:00Z')).open,false,'4:30am Chicago');});
test('student badge only marks documented student perks; nightlife and sights have their own categories',()=>{
 for(const [id,d] of Object.entries(details)){if(d.student)assert.ok(d.benefit&&d.condition,`${id} needs the perk and its condition`);assert.ok(d.sources.every(([label,url])=>label&&/^https?:\/\//.test(url)),id);}
 assert.ok(!details['millennium-park'].student&&details['millennium-park'].kind==='free','free for everyone is not a student perk');
 assert.ok(details['fontanos-subs'].student&&details['mr-greek-gyros'].student);
 assert.ok(['little-joes','metro','second-city'].every(id=>details[id].category==='Nightlife'));
 assert.ok(['field-museum','navy-pier','wrigley-field'].every(id=>details[id].category==='Sights'));
});
test('off-campus events added for October 2026 stay dated and sourced',()=>{
 const now=new Date('2026-10-05T18:00:00Z');
 for(const id of ['field-museum','navy-pier','mca','nmma','lincoln-park-zoo']){const list=currentEvents(details[id],now);assert.ok(list.length,id);for(const e of list)assert.ok(e.title&&/^\d{4}-\d{2}-\d{2}$/.test(e.end)&&/^https:\/\//.test(e.url),`${id}: ${e.title}`);}
 assert.equal(currentEvents(details['navy-pier'],new Date('2026-11-02T18:00:00Z')).length,0,'past pier events drop off');
});
