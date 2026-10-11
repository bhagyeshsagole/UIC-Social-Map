import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../src/nearbyPlaces.json',import.meta.url)));
test('nearby listings have stable IDs, bounded campus distances, sourced copy and credited local images',()=>{
 assert.ok(data.places.length>1900);const ids=new Set();
 const dist=(a,b)=>{const r=Math.PI/180;return 3958.7613*2*Math.asin(Math.sqrt(Math.sin((a[1]-b[1])*r/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin((a[0]-b[0])*r/2)**2));};
 for(const p of data.places){assert.ok(!ids.has(p.id));ids.add(p.id);assert.ok(data.centers.some(c=>dist(c.coords,p.coords)<=2),p.name);assert.ok(p.description&&p.sources.length&&p.photo.credit&&p.photo.alt,p.name);assert.ok(existsSync(new URL('../public/places/'+p.photo.file,import.meta.url)));if(p.student)assert.ok(p.benefit&&p.condition&&p.sources.some(x=>x[1].includes('uic.edu')));}
 for(const category of ['Cafes','Food & drink','Barbers & beauty','Study spaces','Groceries & essentials'])assert.ok(data.places.some(p=>p.category===category));
 assert.ok(data.places.some(p=>!p.photo.illustration));assert.ok(data.places.some(p=>p.id==='headrest-barber-uic'&&p.student));
});
