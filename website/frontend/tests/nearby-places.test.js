import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../src/nearbyPlaces.json',import.meta.url))),hidden=[];
import {parsePlaces} from '../src/content.js';
// The area: one mile from Student Center East or West, or half a mile from any East, West or South campus building.
const campus=JSON.parse(readFileSync(new URL('../src/uic-buildings.json',import.meta.url))).buildings.filter(b=>['EAST','WEST','SOUTH'].includes(b.campus)&&b.coordinates[1]>41.85);
const real=p=>!!(p.photo&&!p.photo.illustration),hours=p=>!!p.schedule||!p.hours.startsWith('Hours not listed');
test('nearby listings have stable IDs, bounded campus distances, sourced copy and credited local images',()=>{
 assert.ok(data.places.length>500);assert.equal(data.radiusMiles,1);assert.equal(data.campusRadiusMiles,.5);const ids=new Set();
 const dist=(a,b)=>{const r=Math.PI/180;return 3958.7613*2*Math.asin(Math.sqrt(Math.sin((a[1]-b[1])*r/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin((a[0]-b[0])*r/2)**2));};
 for(const p of [...data.places,...hidden]){assert.ok(!ids.has(p.id));ids.add(p.id);assert.ok(data.centers.some(c=>dist(c.coords,p.coords)<=1)||campus.some(b=>dist(b.coordinates,p.coords)<=data.campusRadiusMiles),p.name);assert.ok(p.description&&p.sources.length&&p.photo.credit&&p.photo.alt,p.name);const local=p.photo.file||p.photo.fallback;assert.ok(existsSync(new URL('../public/places/'+local,import.meta.url)),p.name);if(!p.photo.file)assert.ok((p.photo.src?.startsWith('https://')||p.photo.proxied)&&/^https?:\/\//.test(p.photo.href),p.name);if(p.student)assert.ok(p.benefit&&p.condition&&p.sources.some(x=>x[1].includes('uic.edu')));}
 for(const category of ['Cafes','Food & drink','Barbers & beauty','Study spaces','Groceries & essentials'])assert.ok([...data.places,...hidden].some(p=>p.category===category));
 assert.ok([...data.places,...hidden].some(p=>p.id==='headrest-barber-uic'&&p.student));
});

test('every nearby place ships, and every proxied photo belongs to a place in the app',()=>{
 const sources=JSON.parse(readFileSync(new URL('../src/placePhotoSources.json',import.meta.url)));
 for(const id of Object.keys(sources))assert.ok(data.places.some(p=>p.id===id&&p.photo.proxied),id);
 assert.ok(data.places.some(p=>real(p)&&hours(p)));
 assert.ok(!existsSync(new URL('../../data/places/hidden-places.json',import.meta.url)),'no hidden store: every place is in the app');
});

test('added_sites.md logs every nearby place once, below the hand-edited places, without changing them',()=>{
 const sites=readFileSync(new URL('../../../added_sites.md',import.meta.url),'utf8'),log=sites.slice(sites.indexOf('<!-- nearby-directory:start -->'));
 assert.ok(log.length<sites.length&&log.includes('<!-- nearby-directory:end -->'));
 for(const p of [...data.places,...hidden])assert.equal(log.split('`'+p.id+'`').length-1,1,p.id);
 assert.match(log,/## Photo and hours \(\d+\)/);assert.match(log,/## Still missing something \(\d+\)/);
 const curated=parsePlaces(sites);assert.ok(curated.length>=80);assert.ok(curated.every(p=>!p.description.includes('nearby-directory')));
});
