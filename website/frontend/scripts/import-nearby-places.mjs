// Reproducible OSM snapshot normalization. Fetch separately; never overwrite curated places.
import {readFileSync,writeFileSync} from 'node:fs';
import {details} from '../src/placeDetails.js';
import {parsePlaces} from '../src/content.js';
const existing=parsePlaces(readFileSync(new URL('../../../added_sites.md',import.meta.url),'utf8')).map(p=>({...details[p.id],...p}));
const raw=JSON.parse(readFileSync(new URL('../../data/places/uic-nearby-osm.json',import.meta.url)));
const centers=[{name:'East campus',coords:[-87.647964,41.871967]},{name:'West campus',coords:[-87.674561,41.870762]}];
const distance=(a,b)=>{const r=Math.PI/180,x=(b[1]-a[1])*r,y=(b[0]-a[0])*r;return 3958.7613*2*Math.asin(Math.sqrt(Math.sin(x/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(y/2)**2));};
const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
const titles={restaurant:'Restaurant',fast_food:'Quick bites',food_court:'Food court',ice_cream:'Ice cream',cafe:'Coffee',library:'Library',bar:'Bar',pub:'Pub',hairdresser:'Haircuts',beauty:'Beauty services',bakery:'Bakery',supermarket:'Groceries',convenience:'Convenience store',books:'Bookshop',laundry:'Laundry'};
const groups={restaurant:'Food & drink',fast_food:'Food & drink',food_court:'Food & drink',ice_cream:'Food & drink',cafe:'Cafes',library:'Study spaces',bar:'Nightlife',pub:'Nightlife',hairdresser:'Barbers & beauty',beauty:'Barbers & beauty',bakery:'Food & drink',supermarket:'Groceries & essentials',convenience:'Groceries & essentials',books:'Books & supplies',laundry:'Everyday services'};
const pics={'Food & drink':'food','Cafes':'cafe','Study spaces':'study','Nightlife':'nightlife','Barbers & beauty':'barber','Groceries & essentials':'grocery','Books & supplies':'study','Everyday services':'services'};
const photos=JSON.parse(readFileSync(new URL('../../data/places/photos.json',import.meta.url)));
const overrides=JSON.parse(readFileSync(new URL('../../data/places/overrides.json',import.meta.url)));
const records=[...overrides.additional];
for(const row of raw.elements){
 const t=row.tags,kind=groups[t.amenity]?t.amenity:t.shop;if(!groups[kind]||!t.name||t.access==='private'||t.disused==='yes'||t.abandoned==='yes'||t['disused:amenity']||t['disused:shop']||/^(closed|disused|former)\b/i.test(t.name))continue;
 const c=row.center||row,coords=[c.lon,c.lat];if(!coords.every(Number.isFinite))continue;
 const distances=centers.map(x=>distance(coords,x.coords)),nearest=Math.min(...distances);if(nearest>2)continue;
 if([...existing,...records].some(p=>distance(p.coords,coords)<.065&&(norm(p.name)===norm(t.name)||norm(p.name).includes(norm(t.name))||norm(t.name).includes(norm(p.name)))))continue;
 const category=groups[kind],near=centers[distances.indexOf(nearest)].name;
 const address=[t['addr:housenumber'],t['addr:street']].filter(Boolean).join(' ')||'Map location · street address not listed';
 const cuisine=(t.cuisine||'').replaceAll('_',' ').split(';').filter(Boolean).slice(0,3);
 const description=`${t.name} is ${kind==='library'?'a library':kind==='hairdresser'?'a hair salon or barbershop':kind==='cafe'?'a café':`a ${titles[kind].toLowerCase()}`} ${t['addr:street']?`on ${t['addr:street']}`:`near UIC’s ${near.toLowerCase()}`}.${cuisine.length?` Listed cuisine: ${cuisine.join(', ')}.`:''}${kind==='library'?' Check access rules, study seating and opening hours before visiting.':''}`;
 const source=`https://www.openstreetmap.org/${row.type}/${row.id}`,website=t.website||t['contact:website'];
 records.push({id:`osm-${row.type}-${row.id}`,name:t.name,description,category,coords,address,neighborhood:`Near ${near}`,campus:near,distanceMiles:+nearest.toFixed(2),checked:'2026-10-10',kind:'regular',student:false,benefit:null,condition:null,tags:[titles[kind],...cuisine],hours:t.opening_hours?`Listed hours: ${t.opening_hours}. Confirm with the venue.`:'Hours not listed. Check with the venue before visiting.',schedule:null,events:[],sources:[['OpenStreetMap contributors · ODbL',source],...(/^https?:\/\//.test(website||'')?[['Venue website',website]]:[])],photo:{file:`category-${pics[category]}.svg`,alt:`${category} illustration — not a photo of ${t.name}`,credit:'Kampuscape · category illustration',href:source,illustration:true},accent:category==='Food & drink'?'orange':category==='Cafes'?'amber':category==='Barbers & beauty'?'rose':'mint',...(['Cafes','Food & drink'].includes(category)?{diet:{nonveg:'ask',veg:'ask',vegan:'ask',gf:'ask',halal:'ask'}}:{})});
}
for(const p of records){if(photos[p.id])p.photo=photos[p.id];if(p.name==='Richard J. Daley Library'){p.description='UIC’s East campus library offers reading areas and reservable group study rooms. Check the library’s current hours and access requirements before visiting.';p.sources.push(['UIC Library · study rooms and access','https://library.uic.edu/libraries/daley/']);}}
records.sort((a,b)=>(a.distanceMiles||0)-(b.distanceMiles||0)||a.name.localeCompare(b.name));
writeFileSync(new URL('../src/nearbyPlaces.json',import.meta.url),JSON.stringify({checked:'2026-10-10',radiusMiles:2,centers,source:'https://www.openstreetmap.org/copyright',places:records}));
console.log('Added sourced places:',records.length, 'Categories:',Object.fromEntries(Object.keys(pics).map(c=>[c,records.filter(p=>p.category===c).length])));
