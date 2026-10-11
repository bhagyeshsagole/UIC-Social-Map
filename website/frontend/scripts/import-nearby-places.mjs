// Reproducible OSM snapshot normalization. Fetch separately; never overwrite curated places.
import {readFileSync,writeFileSync} from 'node:fs';
import {details} from '../src/placeDetails.js';
import {parsePlaces,DIRECTORY_START,DIRECTORY_END} from '../src/content.js';
import {parseOpeningHours} from '../src/openingHours.js';
import {existsSync} from 'node:fs';
const sitesFile=new URL('../../../added_sites.md',import.meta.url);
const existing=parsePlaces(readFileSync(sitesFile,'utf8')).map(p=>({...details[p.id],...p}));
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
 records.push({id:`osm-${row.type}-${row.id}`,name:t.name,description,category,coords,address,neighborhood:`Near ${near}`,campus:near,distanceMiles:+nearest.toFixed(2),checked:'2026-10-10',kind:'regular',student:false,benefit:null,condition:null,tags:[titles[kind],...cuisine],hours:t.opening_hours?`Listed hours: ${t.opening_hours}. Confirm with the venue.`:'Hours not listed. Check with the venue before visiting.',schedule:parseOpeningHours(t.opening_hours),events:[],sources:[['OpenStreetMap contributors · ODbL',source],...(/^https?:\/\//.test(website||'')?[['Venue website',website]]:[])],photo:{file:`category-${pics[category]}.svg`,alt:`${category} illustration — not a photo of ${t.name}`,credit:'Kampuscape · category illustration',href:source,illustration:true},accent:category==='Food & drink'?'orange':category==='Cafes'?'amber':category==='Barbers & beauty'?'rose':'mint',...(['Cafes','Food & drink'].includes(category)?{diet:{nonveg:'ask',veg:'ask',vegan:'ask',gf:'ask',halal:'ask'}}:{})});
}
for(const p of records){if(photos[p.id])p.photo=photos[p.id];if(p.name==='Richard J. Daley Library'){p.description='UIC’s East campus library offers reading areas and reservable group study rooms. Check the library’s current hours and access requirements before visiting.';p.sources.push(['UIC Library · study rooms and access','https://library.uic.edu/libraries/daley/']);}}
// Venue websites and Wikidata (scripts/fetch-venue-websites.mjs) fill hours and photos OpenStreetMap lacks.
const venueFile=new URL('../../data/places/venue-websites.json',import.meta.url);
const venues=existsSync(venueFile)?JSON.parse(readFileSync(venueFile)).places:{};
const photoSources={};
for(const p of records){
 const found=venues[p.id];if(!found)continue;
 if(!p.schedule&&found.website?.hours){p.schedule=found.website.hours.schedule;p.hours='Hours from the venue’s website. Confirm before visiting.';p.sources.push(['Venue website · hours',found.website.page]);}
 if(!p.photo?.illustration)continue;
 const fallback=p.photo.file;
 if(found.commons)p.photo={src:found.commons.src,alt:`Photo of ${p.name}`,credit:`Wikimedia Commons · ${found.commons.credit}`,href:found.commons.page,fallback};
 else if(found.website?.image){photoSources[p.id]=found.website.image.src;p.photo={proxied:true,alt:`Photo from ${p.name}’s website`,credit:`${p.name} website`,href:found.website.page,fallback};}
}
// Hours an editor checked by hand, in OpenStreetMap syntax: overrides.json → hours: {id: {opening_hours, source}}.
for(const p of records){const fix=overrides.hours?.[p.id],schedule=fix&&parseOpeningHours(fix.opening_hours);if(schedule){p.schedule=schedule;p.hours='Hours checked by Kampuscape. Confirm before visiting.';p.sources.push(['Hours source',fix.source]);}}
records.sort((a,b)=>(a.distanceMiles||0)-(b.distanceMiles||0)||a.name.localeCompare(b.name));
// The app shows a nearby place only once it has a real photo and listed hours. The rest stay stored,
// with what they lack, and come back automatically when a rerun finds both.
const missing=p=>[...(p.schedule||!p.hours.startsWith('Hours not listed')?[]:['hours']),...(p.photo&&!p.photo.illustration?[]:['photo'])];
const shown=records.filter(p=>!missing(p).length),hidden=records.filter(p=>missing(p).length).map(p=>({...p,missing:missing(p)}));
writeFileSync(new URL('../src/nearbyPlaces.json',import.meta.url),JSON.stringify({checked:'2026-10-10',radiusMiles:2,centers,source:'https://www.openstreetmap.org/copyright',places:shown}));
writeFileSync(new URL('../../data/places/hidden-places.json',import.meta.url),JSON.stringify({checked:'2026-10-10',note:'Nearby places kept out of the app until they have a real photo and listed hours. Rerun scripts/import-nearby-places.mjs after fixing a source.',places:hidden}));
writeFileSync(new URL('../src/placePhotoSources.json',import.meta.url),JSON.stringify(Object.fromEntries(Object.entries(photoSources).filter(([id])=>shown.some(p=>p.id===id)))));
// Log every nearby place in added_sites.md, below the hand-edited places, so editors can see what is hidden and why.
const cell=v=>String(v??'').replaceAll('|','\\|').replace(/\s+/g,' ').trim();
const table=(list,quote='')=>[`${quote}| Place | Category | Address | ID |`,`${quote}| --- | --- | --- | --- |`,...list.map(p=>`${quote}| ${cell(p.name)} | ${cell(p.category)} | ${cell(p.address)} | \`${p.id}\` |`)].join('\n');
const group=(title,list)=>`> [!note]- ${title} (${list.length})\n>\n${table(list,'> ')}`;
const lacking=key=>hidden.filter(p=>p.missing.join()===key);
const log=`${DIRECTORY_START}
# Nearby directory

Generated by \`website/frontend/scripts/import-nearby-places.mjs\` (checked 2026-10-10). Edit the sources, not this list. Places within two miles of East or West campus, from OpenStreetMap, venue websites and Wikimedia Commons. See the [places data README](website/data/places/README.md) for sources.

A nearby place appears in the app only when it has a real photo and listed hours. Hidden places are stored in [hidden-places.json](website/data/places/hidden-places.json). To bring one back, add a credited photo to \`website/data/places/photos.json\` or hours to \`overrides.json\` (\`hours\`), or fix it in OpenStreetMap, then rerun the importer.

## Shown in the app (${shown.length})

${table(shown)}

## Hidden until fixed (${hidden.length})

${group('Missing hours and a photo',lacking('hours,photo'))}

${group('Missing a photo',lacking('photo'))}

${group('Missing hours',lacking('hours'))}
${DIRECTORY_END}`;
const sites=readFileSync(sitesFile,'utf8'),start=sites.indexOf(DIRECTORY_START),end=sites.indexOf(DIRECTORY_END);
writeFileSync(sitesFile,start<0?`${sites.trimEnd()}\n\n${log}\n`:`${sites.slice(0,start)}${log}${sites.slice(end+DIRECTORY_END.length)}`);
console.log('Nearby places:',records.length,'shown:',shown.length,'hidden:',hidden.length,{missingBoth:lacking('hours,photo').length,missingPhoto:lacking('photo').length,missingHours:lacking('hours').length});
