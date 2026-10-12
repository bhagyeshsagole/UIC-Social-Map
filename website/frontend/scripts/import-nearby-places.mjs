// Reproducible OSM snapshot normalization. Fetch separately; never overwrite curated places.
import {readFileSync,writeFileSync} from 'node:fs';
import {details} from '../src/placeDetails.js';
import {parsePlaces,DIRECTORY_START,DIRECTORY_END} from '../src/content.js';
import {parseOpeningHours} from '../src/openingHours.js';
import {existsSync} from 'node:fs';
const sitesFile=new URL('../../../added_sites.md',import.meta.url);
const existing=parsePlaces(readFileSync(sitesFile,'utf8')).map(p=>({...details[p.id],...p}));
const raw=JSON.parse(readFileSync(new URL('../../data/places/uic-nearby-osm.json',import.meta.url)));
// Hard limit: one straight-line mile from Student Center East or West.
const RADIUS=1;
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
 const distances=centers.map(x=>distance(coords,x.coords)),nearest=Math.min(...distances);if(nearest>RADIUS)continue;
 if([...existing,...records].some(p=>distance(p.coords,coords)<.065&&(norm(p.name)===norm(t.name)||norm(p.name).includes(norm(t.name))||norm(t.name).includes(norm(p.name)))))continue;
 const category=groups[kind],near=centers[distances.indexOf(nearest)].name;
 const address=[t['addr:housenumber'],t['addr:street']].filter(Boolean).join(' ')||'Map location · street address not listed';
 const cuisine=(t.cuisine||'').replaceAll('_',' ').split(';').filter(Boolean).slice(0,3);
 const description=`${t.name} is ${kind==='library'?'a library':kind==='hairdresser'?'a hair salon or barbershop':kind==='cafe'?'a café':`a ${titles[kind].toLowerCase()}`} ${t['addr:street']?`on ${t['addr:street']}`:`near UIC’s ${near.toLowerCase()}`}.${cuisine.length?` Listed cuisine: ${cuisine.join(', ')}.`:''}${kind==='library'?' Check access rules, study seating and opening hours before visiting.':''}`;
 const source=`https://www.openstreetmap.org/${row.type}/${row.id}`,website=t.website||t['contact:website'];
 records.push({id:`osm-${row.type}-${row.id}`,name:t.name,description,category,coords,address,neighborhood:`Near ${near}`,campus:near,distanceMiles:+nearest.toFixed(2),checked:'2026-10-10',kind:'regular',student:false,benefit:null,condition:null,tags:[titles[kind],...cuisine],hours:t.opening_hours?`Listed hours: ${t.opening_hours}. Confirm with the venue.`:'Hours not listed. Check with the venue before visiting.',schedule:parseOpeningHours(t.opening_hours),events:[],sources:[['OpenStreetMap contributors · ODbL',source],...(/^https?:\/\//.test(website||'')?[['Venue website',website]]:[])],photo:{file:`category-${pics[category]}.svg`,alt:`${category} illustration — not a photo of ${t.name}`,credit:'Kampuscape · category illustration',href:source,illustration:true},accent:category==='Food & drink'?'orange':category==='Cafes'?'amber':category==='Barbers & beauty'?'rose':'mint',...(['Cafes','Food & drink'].includes(category)?{diet:{nonveg:'ask',veg:'ask',vegan:'ask',gf:'ask',halal:'ask'}}:{})});
}
for(const p of records){if(photos[p.id])p.photo=photos[p.id];if(p.name==='Richard J. Daley Library'){p.description='UIC’s East campus library offers reading areas and reservable group study rooms. Check the library’s current hours and access requirements before visiting.';p.sources.push(['UIC Library · study rooms and access','https://library.uic.edu/libraries/daley/']);}}
// Venue websites (scripts/fetch-venue-websites.mjs) and Wikidata/Commons (scripts/fetch-commons-photos.mjs)
// fill hours and photos OpenStreetMap lacks. Freely licensed photos come before venue-website photos.
const snapshot=file=>{const url=new URL(`../../data/places/${file}`,import.meta.url);return existsSync(url)?JSON.parse(readFileSync(url)).places:{};};
const venues=snapshot('venue-websites.json'),commonsPhotos=snapshot('commons-photos.json'),chainHours=snapshot('chain-hours.json');
// Photos rejected on review (contact sheets) never ship, whichever source offers them again.
const review=existsSync(new URL('../../data/places/photo-review.json',import.meta.url))?JSON.parse(readFileSync(new URL('../../data/places/photo-review.json',import.meta.url))):{},rejected=review.rejected||{},approvedWebsite=review.approvedWebsite||{};
const photoSources={};
// A website photo offered for several places is a shared or generic image (a food hall's banner), not any one of them.
const srcCount=new globalThis.Map();for(const v of Object.values(venues)){const src=v.website?.image?.src;if(src)srcCount.set(src,(srcCount.get(src)||0)+1);}
for(const p of records){
 const found=venues[p.id]||{},hours=found.website?.hours;
 if(!p.schedule&&hours){p.schedule=hours.schedule;p.hours='Hours from the venue’s website. Confirm before visiting.';p.sources.push(['Venue website · hours',hours.page||found.website.page]);}
 const chain=chainHours[p.id];
 if(!p.schedule&&chain){p.schedule=chain.schedule;p.hours='Hours from the store’s page. Confirm before visiting.';p.sources.push(['Store page · hours',chain.page]);}
 if(!p.photo?.illustration)continue;
 const fallback=p.photo.file,free=commonsPhotos[p.id]||found.commons;
 // Photos picked by hand from a venue's or the university's own pages (photo-review.json → approvedWebsite).
 const picked=approvedWebsite[p.id];
 if(picked){photoSources[p.id]=picked.src;p.photo={proxied:true,alt:picked.alt||`Photo of ${p.name}`,credit:picked.credit,href:picked.page,fallback};continue;}
 if(rejected[p.id])continue;
 if(free)p.photo={src:free.src,alt:`Photo of ${p.name}`,credit:`Wikimedia Commons · ${free.credit}`,href:free.page,fallback};
 else if(found.website?.image&&srcCount.get(found.website.image.src)===1){photoSources[p.id]=found.website.image.src;p.photo={proxied:true,alt:`Photo from the ${p.name} website`,credit:`${p.name} website`,href:found.website.page,fallback};}
}
// Hours an editor checked by hand, in OpenStreetMap syntax: overrides.json → hours: {id: {opening_hours, source}}.
for(const p of records){const fix=overrides.hours?.[p.id],schedule=fix&&parseOpeningHours(fix.opening_hours);if(schedule){p.schedule=schedule;p.hours='Hours checked by Kampuscape. Confirm before visiting.';p.sources.push(['Hours source',fix.source]);}}
// Names and addresses an editor checked by hand: overrides.json → details: {id: {name, address}}.
for(const p of records){const fix=overrides.details?.[p.id];if(!fix)continue;if(fix.name){p.description=p.description.replaceAll(p.name,fix.name);p.name=fix.name;}if(fix.address)p.address=fix.address;}
records.sort((a,b)=>(a.distanceMiles||0)-(b.distanceMiles||0)||a.name.localeCompare(b.name));
// Every nearby place ships; the log below tracks which still need a photo or hours.
const missing=p=>[...(p.schedule||!p.hours.startsWith('Hours not listed')?[]:['hours']),...(p.photo&&!p.photo.illustration?[]:['photo'])];
records.splice(0,records.length,...records.filter(p=>distance(p.coords,centers[0].coords)<=RADIUS||distance(p.coords,centers[1].coords)<=RADIUS));
// Places confirmed closed or moved stay out of the app (overrides.json → closed) and are listed in the log instead.
const closed=records.filter(p=>overrides.closed?.[p.id]).map(p=>({...p,closed:overrides.closed[p.id]}));
records.splice(0,records.length,...records.filter(p=>!overrides.closed?.[p.id]));
writeFileSync(new URL('../src/nearbyPlaces.json',import.meta.url),JSON.stringify({checked:'2026-10-10',radiusMiles:RADIUS,centers,source:'https://www.openstreetmap.org/copyright',places:records}));
writeFileSync(new URL('../src/placePhotoSources.json',import.meta.url),JSON.stringify(Object.fromEntries(Object.entries(photoSources).filter(([id])=>records.some(p=>p.id===id)))));
// Log every nearby place in added_sites.md, below the hand-edited places, so editors can see what still needs a photo or hours.
const cell=v=>String(v??'').replaceAll('|','\\|').replace(/\s+/g,' ').trim();
const table=(list,quote='')=>[`${quote}| Place | Category | Address | ID |`,`${quote}| --- | --- | --- | --- |`,...list.map(p=>`${quote}| ${cell(p.name)} | ${cell(p.category)} | ${cell(p.address)} | \`${p.id}\` |`)].join('\n');
const group=(title,list)=>`> [!note]- ${title} (${list.length})\n>\n${table(list,'> ')}`;
const lacking=key=>records.filter(p=>missing(p).join()===key);
const log=`${DIRECTORY_START}
# Nearby directory

Generated by \`website/frontend/scripts/import-nearby-places.mjs\` (checked 2026-10-10). Edit the sources, not this list. Every place within one mile of Student Center East or West, from OpenStreetMap, venue websites and Wikimedia Commons. See the [places data README](website/data/places/README.md) for sources.

Every place below is in the app except the closed or moved list at the end. The lists track which still need a photo or hours. To fill one in, add a credited photo to \`website/data/places/photos.json\` or hand-checked hours to \`overrides.json\` (\`hours\`), or fix it in OpenStreetMap, then rerun the importer.

## Photo and hours (${lacking('').length})

${table(lacking(''))}

## Still missing something (${records.length-lacking('').length})

${group('Missing hours and a photo',lacking('hours,photo'))}

${group('Missing a photo',lacking('photo'))}

${group('Missing hours',lacking('hours'))}

## Closed or moved (${closed.length})

Not shown in the app. Each was checked against the business's own listing or website; remove its entry from \`overrides.json\` (\`closed\`) if it reopens.

> [!note]- Closed or moved (${closed.length})
>
> | Place | Status | Address | ID |
> | --- | --- | --- | --- |
${closed.map(p=>`> | ${cell(p.name)} | ${cell(`${p.closed.status}${p.closed.note?`: ${p.closed.note}`:''} (checked ${p.closed.checked})`)} | ${cell(p.address)} | \`${p.id}\` |`).join('\n')}
${DIRECTORY_END}`;
const sites=readFileSync(sitesFile,'utf8'),start=sites.indexOf(DIRECTORY_START),end=sites.indexOf(DIRECTORY_END);
writeFileSync(sitesFile,start<0?`${sites.trimEnd()}\n\n${log}\n`:`${sites.slice(0,start)}${log}${sites.slice(end+DIRECTORY_END.length)}`);
console.log('Nearby places:',records.length,'complete:',lacking('').length,'closed or moved:',closed.length,{missingBoth:lacking('hours,photo').length,missingPhoto:lacking('photo').length,missingHours:lacking('hours').length});
