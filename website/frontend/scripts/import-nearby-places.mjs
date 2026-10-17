// Reproducible OSM snapshot normalization. Fetch separately; never overwrite curated places.
import {readFileSync,writeFileSync} from 'node:fs';
import {details} from '../src/placeDetails.js';
import {parsePlaces,DIRECTORY_START,DIRECTORY_END} from '../src/content.js';
import {parseOpeningHours} from '../src/openingHours.js';
import {existsSync} from 'node:fs';
import {lighterImage} from './lib/lighterImage.mjs';
const sitesFile=new URL('../../../added_sites.md',import.meta.url);
const existing=parsePlaces(readFileSync(sitesFile,'utf8')).map(p=>({...details[p.id],...p}));
const raw=JSON.parse(readFileSync(new URL('../../data/places/uic-nearby-osm.json',import.meta.url)));
// Hard limit: one straight-line mile from Student Center East or West, or half a mile from any East, West or South campus building.
const RADIUS=1,CAMPUS_RADIUS=.5;
const centers=[{name:'East campus',coords:[-87.647964,41.871967]},{name:'West campus',coords:[-87.674561,41.870762]}];
const distance=(a,b)=>{const r=Math.PI/180,x=(b[1]-a[1])*r,y=(b[0]-a[0])*r;return 3958.7613*2*Math.asin(Math.sqrt(Math.sin(x/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(y/2)**2));};
const campusBuildings=JSON.parse(readFileSync(new URL('../src/uic-buildings.json',import.meta.url))).buildings.filter(b=>['EAST','WEST','SOUTH'].includes(b.campus)&&b.coordinates[1]>41.85);
const campusMiles=coords=>Math.min(...campusBuildings.map(b=>distance(coords,b.coordinates)));
const inArea=coords=>centers.some(c=>distance(coords,c.coords)<=RADIUS)||campusMiles(coords)<=CAMPUS_RADIUS;
const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
const titles={restaurant:'Restaurant',fast_food:'Quick bites',food_court:'Food court',ice_cream:'Ice cream',cafe:'Coffee',library:'Library',bar:'Bar',pub:'Pub',hairdresser:'Haircuts',beauty:'Beauty services',bakery:'Bakery',supermarket:'Groceries',convenience:'Convenience store',books:'Bookshop',laundry:'Laundry',
 nightclub:'Nightclub',biergarten:'Beer garden',pharmacy:'Pharmacy',cinema:'Cinema',theatre:'Theatre',arts_centre:'Arts centre',post_office:'Post office',coffee:'Coffee shop',tea:'Tea shop',greengrocer:'Produce market',deli:'Deli',butcher:'Butcher',seafood:'Seafood market',chemist:'Pharmacy',department_store:'Department store',variety_store:'Variety store',general:'General store',health_food:'Health food store',pastry:'Pastry shop',confectionery:'Sweets',chocolate:'Chocolate shop',dry_cleaning:'Dry cleaner',copyshop:'Print shop',stationery:'Stationery',museum:'Museum',gallery:'Gallery',attraction:'Landmark',viewpoint:'Viewpoint',fitness_centre:'Gym',sports_centre:'Sports centre',park:'Park'};
const groups={restaurant:'Food & drink',fast_food:'Food & drink',food_court:'Food & drink',ice_cream:'Food & drink',cafe:'Cafes',library:'Study spaces',bar:'Nightlife',pub:'Nightlife',hairdresser:'Barbers & beauty',beauty:'Barbers & beauty',bakery:'Food & drink',supermarket:'Groceries & essentials',convenience:'Groceries & essentials',books:'Books & supplies',laundry:'Everyday services',
 nightclub:'Nightlife',biergarten:'Nightlife',pharmacy:'Groceries & essentials',cinema:'Arts & culture',theatre:'Arts & culture',arts_centre:'Arts & culture',post_office:'Everyday services',coffee:'Cafes',tea:'Cafes',greengrocer:'Groceries & essentials',deli:'Food & drink',butcher:'Groceries & essentials',seafood:'Groceries & essentials',chemist:'Groceries & essentials',department_store:'Groceries & essentials',variety_store:'Groceries & essentials',general:'Groceries & essentials',health_food:'Groceries & essentials',pastry:'Food & drink',confectionery:'Food & drink',chocolate:'Food & drink',dry_cleaning:'Everyday services',copyshop:'Everyday services',stationery:'Books & supplies',museum:'Arts & culture',gallery:'Arts & culture',attraction:'Sights',viewpoint:'Sights',fitness_centre:'Get active',sports_centre:'Get active',park:'Outdoors'};
const pics={'Food & drink':'food','Cafes':'cafe','Study spaces':'study','Nightlife':'nightlife','Barbers & beauty':'barber','Groceries & essentials':'grocery','Books & supplies':'study','Everyday services':'services','Arts & culture':'culture','Sights':'sights','Get active':'active','Outdoors':'outdoors'};
const accents={'Food & drink':'orange','Cafes':'amber','Barbers & beauty':'rose','Arts & culture':'purple','Sights':'purple'};
const article=w=>/^[aeiou]/i.test(w)?'an':'a';
const photos=JSON.parse(readFileSync(new URL('../../data/places/photos.json',import.meta.url)));
const overrides=JSON.parse(readFileSync(new URL('../../data/places/overrides.json',import.meta.url)));
const records=[...overrides.additional];
for(const row of raw.elements){
 const t=row.tags,kind=[t.amenity,t.shop,t.tourism,t.leisure].find(k=>groups[k]);if(!groups[kind]||!t.name||t.access==='private'||t.disused==='yes'||t.abandoned==='yes'||t['disused:amenity']||t['disused:shop']||/^(closed|disused|former)\b/i.test(t.name))continue;
 // Parks and sports grounds count when a public operator or site stands behind them, not every campus courtyard or school field.
 if(['park','sports_centre'].includes(kind)&&!(t.website||t['contact:website']||t.wikidata||t.operator==='Chicago Park District'||/park district/i.test(t.name)||/fieldhouse/i.test(t.name)))continue;
 // Listings an editor matched to a hand-edited place (overrides.json → duplicates) are left to that place;
 // listings that are not places a student can use (overrides.json → excluded) stay out.
 if(overrides.duplicates?.[`osm-${row.type}-${row.id}`]||overrides.excluded?.[`osm-${row.type}-${row.id}`])continue;
 const c=row.center||row,coords=[c.lon,c.lat];if(!coords.every(Number.isFinite))continue;
 const distances=centers.map(x=>distance(coords,x.coords)),nearest=Math.min(...distances);if(!inArea(coords))continue;
 if([...existing,...records].some(p=>distance(p.coords,coords)<.065&&(norm(p.name)===norm(t.name)||norm(p.name).includes(norm(t.name))||norm(t.name).includes(norm(p.name)))))continue;
 const category=groups[kind],near=centers[distances.indexOf(nearest)].name;
 const address=[t['addr:housenumber'],t['addr:street']].filter(Boolean).join(' ')||'Map location · street address not listed';
 const cuisine=(t.cuisine||'').replaceAll('_',' ').split(';').filter(Boolean).slice(0,3);
 const description=`${t.name} is ${kind==='library'?'a library':kind==='hairdresser'?'a hair salon or barbershop':kind==='cafe'?'a café':`${article(titles[kind])} ${titles[kind].toLowerCase()}`} ${t['addr:street']?`on ${t['addr:street']}`:`near UIC’s ${near.toLowerCase()}`}.${cuisine.length?` Listed cuisine: ${cuisine.join(', ')}.`:''}${kind==='library'?' Check access rules, study seating and opening hours before visiting.':''}`;
 const source=`https://www.openstreetmap.org/${row.type}/${row.id}`,website=t.website||t['contact:website'];
 records.push({id:`osm-${row.type}-${row.id}`,name:t.name,description,category,coords,address,neighborhood:`Near ${near}`,campus:near,distanceMiles:+nearest.toFixed(2),checked:'2026-10-10',kind:'regular',student:false,benefit:null,condition:null,tags:[titles[kind],...cuisine],hours:t.opening_hours?`Listed hours: ${t.opening_hours}. Confirm with the venue.`:'Hours not listed. Check with the venue before visiting.',schedule:parseOpeningHours(t.opening_hours),events:[],sources:[['OpenStreetMap contributors · ODbL',source],...(/^https?:\/\//.test(website||'')?[['Venue website',website]]:[])],photo:{file:`category-${pics[category]}.svg`,alt:`${category} illustration — not a photo of ${t.name}`,credit:'Kampuscape · category illustration',href:source,illustration:true},accent:accents[category]||'mint',...(['Cafes','Food & drink'].includes(category)?{diet:{nonveg:'ask',veg:'ask',vegan:'ask',gf:'ask',halal:'ask'}}:{})});
}
for(const p of records){if(photos[p.id])p.photo=photos[p.id];if(p.name==='Richard J. Daley Library'){p.description='UIC’s East campus library offers reading areas and reservable group study rooms. Check the library’s current hours and access requirements before visiting.';p.sources.push(['UIC Library · study rooms and access','https://library.uic.edu/libraries/daley/']);}}
// Venue websites (scripts/fetch-venue-websites.mjs) and Wikidata/Commons (scripts/fetch-commons-photos.mjs)
// fill hours and photos OpenStreetMap lacks. Freely licensed photos come before venue-website photos.
const snapshot=file=>{const url=new URL(`../../data/places/${file}`,import.meta.url);return existsSync(url)?JSON.parse(readFileSync(url)).places:{};};
const venues=snapshot('venue-websites.json'),commonsPhotos=snapshot('commons-photos.json'),chainHours=snapshot('chain-hours.json'),parkPages=snapshot('park-district.json');
const brandPhotos=existsSync(new URL('../../data/places/brand-photos.json',import.meta.url))?JSON.parse(readFileSync(new URL('../../data/places/brand-photos.json',import.meta.url))).brands:{};
const brandOf=new globalThis.Map(raw.elements.map(e=>[`osm-${e.type}-${e.id}`,e.tags?.['brand:wikidata']]));
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
 // Chicago Park District pages (scripts/fetch-park-district.mjs): weekly park hours and the park's own photo.
 const park=parkPages[p.id];
 if(!p.schedule&&park?.schedule){p.schedule=park.schedule;p.hours='Hours from the Chicago Park District. Confirm before visiting.';p.sources.push(['Chicago Park District',park.page]);}
 if(p.photo?.illustration&&park?.image&&rejected[p.id]?.src!==park.image.src){photoSources[p.id]=park.image.src;p.photo={proxied:true,alt:`Photo of ${p.name} from the Chicago Park District`,credit:'Chicago Park District',href:park.page,fallback:p.photo.file};}
 if(!p.photo?.illustration)continue;
 const fallback=p.photo.file,free=commonsPhotos[p.id]||found.commons;
 // Photos picked by hand from a venue's or the university's own pages (photo-review.json → approvedWebsite).
 const picked=approvedWebsite[p.id];
 if(picked){photoSources[p.id]=picked.src;p.photo={proxied:true,alt:picked.alt||`Photo of ${p.name}`,credit:picked.credit,href:picked.page,fallback};continue;}
 if(rejected[p.id])continue;
 if(free)p.photo={src:free.src,alt:`Photo of ${p.name}`,credit:`Wikimedia Commons · ${free.credit}`,href:free.page,fallback};
 else if(found.website?.image&&srcCount.get(found.website.image.src)===1){photoSources[p.id]=found.website.image.src;p.photo={proxied:true,alt:`Photo from the ${p.name} website`,credit:`${p.name} website`,href:found.website.page,fallback};}
}
// Photos from the place's own Google Maps listing (accepted 2026-10-16 for places with no other photo): saved
// locally under public/places/google/, credited to the listing, checked by eye. data/places/google-photos.json.
const googlePhotos=existsSync(new URL('../../data/places/google-photos.json',import.meta.url))?JSON.parse(readFileSync(new URL('../../data/places/google-photos.json',import.meta.url))).places:{};
for(const p of records){const g=googlePhotos[p.id];if(!p.photo?.illustration||!g)continue;p.photo={file:g.file,alt:`Photo of ${p.name} from its Google Maps listing`,credit:'Google Maps listing photo',href:g.page,fallback:p.photo.file};}
// A chain branch still without its own photo shows the brand's photo (scripts/fetch-brand-photos.mjs), labeled as
// not this branch (accepted 2026-10-16, replacing the no-brand-photo rule).
for(const p of records){
 const brand=brandPhotos[brandOf.get(p.id)];if(!p.photo?.illustration||!brand?.src)continue;
 const credit=brand.website?`${brand.brand} website · brand photo, not this branch`:`Brand photo, not this branch · Wikimedia Commons · ${brand.author} · ${brand.license}`;
 if(brand.website)photoSources[p.id]=brand.src;
 p.photo={...(brand.website?{proxied:true}:{src:brand.src}),alt:`${brand.brand} brand photo, not this branch`,credit,href:brand.page,fallback:p.photo.file,brand:true};
}
// Hours an editor checked by hand, in OpenStreetMap syntax: overrides.json → hours: {id: {opening_hours, source}}.
for(const p of records){const fix=overrides.hours?.[p.id],schedule=fix&&parseOpeningHours(fix.opening_hours);if(schedule){p.schedule=schedule;p.hours='Hours checked by Kampuscape. Confirm before visiting.';p.sources.push(['Hours source',fix.source]);}}
// Names and addresses an editor checked by hand: overrides.json → details: {id: {name, address}};
// website: null drops a dead or hijacked venue link.
for(const p of records){const fix=overrides.details?.[p.id];if(!fix)continue;if(fix.name){p.description=p.description.replaceAll(p.name,fix.name);p.name=fix.name;}if(fix.address)p.address=fix.address;if(fix.website===null)p.sources=p.sources.filter(([label])=>label!=='Venue website');}
records.sort((a,b)=>(a.distanceMiles||0)-(b.distanceMiles||0)||a.name.localeCompare(b.name));
// Every nearby place ships; the log below tracks which still need a photo or hours.
const missing=p=>[...(p.schedule||!p.hours.startsWith('Hours not listed')?[]:['hours']),...(p.photo&&!p.photo.illustration?[]:['photo'])];
records.splice(0,records.length,...records.filter(p=>inArea(p.coords)));
// Places confirmed closed or moved stay out of the app (overrides.json → closed) and are listed in the log instead.
const closed=records.filter(p=>overrides.closed?.[p.id]).map(p=>({...p,closed:overrides.closed[p.id]}));
records.splice(0,records.length,...records.filter(p=>!overrides.closed?.[p.id]));
// Card-sized copies from image hosts that resize on request (scripts/lib/lighterImage.mjs).
for(const p of records)if(p.photo?.src)p.photo.src=lighterImage(p.photo.src);
for(const id of Object.keys(photoSources))photoSources[id]=lighterImage(photoSources[id]);
writeFileSync(new URL('../src/nearbyPlaces.json',import.meta.url),JSON.stringify({checked:'2026-10-16',radiusMiles:RADIUS,campusRadiusMiles:CAMPUS_RADIUS,centers,source:'https://www.openstreetmap.org/copyright',places:records}));
writeFileSync(new URL('../src/placePhotoSources.json',import.meta.url),JSON.stringify(Object.fromEntries(Object.entries(photoSources).filter(([id])=>records.some(p=>p.id===id)))));
// Log every nearby place in added_sites.md, below the hand-edited places, so editors can see what still needs a photo or hours.
const cell=v=>String(v??'').replaceAll('|','\\|').replace(/\s+/g,' ').trim();
const table=(list,quote='')=>[`${quote}| Place | Category | Address | ID |`,`${quote}| --- | --- | --- | --- |`,...list.map(p=>`${quote}| ${cell(p.name)} | ${cell(p.category)} | ${cell(p.address)} | \`${p.id}\` |`)].join('\n');
const group=(title,list)=>`> [!note]- ${title} (${list.length})\n>\n${table(list,'> ')}`;
const lacking=key=>records.filter(p=>missing(p).join()===key);
const log=`${DIRECTORY_START}
# Nearby directory

Generated by \`website/frontend/scripts/import-nearby-places.mjs\` (checked 2026-10-16). Edit the sources, not this list. Every place within one mile of Student Center East or West or half a mile of a campus building, from OpenStreetMap, venue websites, chain store pages, the Chicago Park District and Wikimedia Commons. See the [places data README](website/data/places/README.md) for sources.

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
