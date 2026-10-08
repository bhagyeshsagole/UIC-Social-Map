import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingLabel,detailsFromElements,detailsFromReverse,lookupBuilding} from '../src/buildingDetails.js';
// Synthetic roofs, addresses, and POIs; not published map content.
const ring=[[0,0],[.001,0],[.001,.001],[0,.001],[0,0]];
const venue={id:'synthetic-roof',coords:[.0005,.0005],footprint:{type:'Polygon',coordinates:[ring]}};
const way=tags=>({type:'way',tags:{building:'yes',...tags},geometry:ring.map(([lon,lat])=>({lon,lat}))});
test('building name wins, with a complete street address as fallback',()=>{
 assert.deepEqual(buildingLabel({name:'Synthetic Hall','addr:housenumber':'12','addr:street':'Test Street'}),{name:'Synthetic Hall',address:'12 Test Street'});
 assert.equal(buildingLabel({'addr:housenumber':'12','addr:street':'Test Street'}).name,'12 Test Street');
 assert.equal(buildingLabel({'addr:street':'Test Street'}).name,'');
 assert.equal(buildingLabel({'addr:full':'12 Test Street'}).name,'12 Test Street');
});
test('matches the selected roof, not a neighboring named building',()=>{
 const neighbor=way({name:'Wrong roof'});neighbor.geometry=neighbor.geometry.map(p=>({...p,lon:p.lon+.002}));
 assert.equal(detailsFromElements(venue,[neighbor]),null);
 assert.deepEqual(detailsFromElements(venue,[neighbor,way({name:'Synthetic Hall','addr:full':'12 Test Street'})]),{name:'Synthetic Hall',address:'12 Test Street'});
 assert.equal(detailsFromElements(venue,[way({'addr:full':'12 Test Street'})]).name,'12 Test Street');
});
test('uses address nodes inside a roof but does not guess between multiple addresses',()=>{
 const node=address=>({type:'node',lon:.0005,lat:.0005,tags:{'addr:full':address}});
 assert.equal(detailsFromElements(venue,[node('12 Test Street')]).name,'12 Test Street');
 assert.equal(detailsFromElements(venue,[node('12 Test Street'),node('14 Test Street')]),null);
 assert.equal(detailsFromElements(venue,[{...node('Wrong'),lon:2}]),null);
 const courtyard={...venue,footprint:{type:'Polygon',coordinates:[ring,[[.0004,.0004],[.0006,.0004],[.0006,.0006],[.0004,.0006],[.0004,.0004]]]}};
 assert.equal(detailsFromElements(courtyard,[node('Inside hole')]),null);
});
test('lookup caches successful results and cancels before requesting on repin',async()=>{
 let calls=0;
 // Nominatim finds nothing here, so Overpass answers; only Overpass calls are counted.
 const fetcher=async url=>{if(String(url).includes('reverse'))return {ok:true,json:async()=>({error:'Unable to geocode'})};calls++;return {ok:true,json:async()=>({elements:[way({name:'Synthetic Hall'})]})};};
 assert.equal((await lookupBuilding(venue,{fetcher})).name,'Synthetic Hall');
 await lookupBuilding(venue,{fetcher});assert.equal(calls,1);
 const controller=new AbortController();controller.abort();
 await assert.rejects(lookupBuilding({...venue,id:'cancelled'},{fetcher,signal:controller.signal}),{name:'AbortError'});
 assert.equal(calls,1);
});
test('fast reverse lookup is used only when it covers the selected roof',async()=>{
 const roof={type:'Polygon',coordinates:[ring]};
 assert.deepEqual(detailsFromReverse(venue,{category:'building',name:'Synthetic Hall',address:{house_number:'12',road:'Test Street'},geojson:roof}),{name:'Synthetic Hall',address:'12 Test Street'});
 assert.equal(detailsFromReverse(venue,{category:'amenity',name:'Whole campus',geojson:roof}),null,'non-building areas never name a roof');
 const house={type:'Polygon',coordinates:[[[0,0],[.0002,0],[.0002,.0002],[0,.0002],[0,0]]]};
 assert.equal(detailsFromReverse({...venue,tap:[.0008,.0008]},{category:'building',name:'',address:{house_number:'14',road:'Test Street'},geojson:house}),null,'neighbouring house under a merged footprint');
 assert.equal(detailsFromReverse({...venue,tap:[.0001,.0001]},{category:'building',name:'',address:{house_number:'14',road:'Test Street'},geojson:house}).name,'14 Test Street','house under the tap');
 // 3D tap a few metres behind a roof: centre inside the hit-tested roof, ~5 m away.
 assert.equal(detailsFromReverse({...venue,tap:[.00025,.0001]},{category:'building',lon:'.0001',lat:'.0001',address:{house_number:'14',road:'Test Street'},geojson:house}).name,'14 Test Street','3D roof tap just outside the outline');
 assert.equal(detailsFromReverse({...venue,tap:[.00025,.0001]},{category:'building',lon:'.003',lat:'.003',address:{house_number:'99',road:'Far Street'},geojson:house}),null,'centre outside the selected roof');
 assert.deepEqual(detailsFromReverse(venue,{name:'',address:{house_number:'12',road:'Test Street'},geojson:{type:'Point',coordinates:[.0005,.0005]}}),{name:'12 Test Street',address:'12 Test Street'});
 assert.equal(detailsFromReverse(venue,{name:'Corner shop',geojson:{type:'Point',coordinates:[.003,.003]}}),null,'nearby point outside the roof');
 assert.equal(detailsFromReverse(venue,{name:'',address:{road:'Test Street'},geojson:roof}),null,'street alone is not an address');
 let overpass=0;
 const fetcher=async url=>String(url).includes('reverse')?{ok:true,json:async()=>({category:'building',name:'Synthetic Hall',address:{},geojson:roof})}:(overpass++,{ok:true,json:async()=>({elements:[]})});
 assert.equal((await lookupBuilding({...venue,id:'reverse-hit'},{fetcher})).name,'Synthetic Hall');
 assert.equal(overpass,0,'Overpass is skipped when the fast lookup matches');
});
test('an answered empty reverse lookup is final; only an unreachable one falls back',async()=>{
 let overpass=0;
 const nothing=async url=>String(url).includes('reverse')?{ok:true,json:async()=>({category:'highway',name:'Test Street',geojson:{type:'Point',coordinates:[.003,.003]}})}:(overpass++,{ok:true,json:async()=>({elements:[way({name:'Synthetic Hall'})]})});
 assert.equal(await lookupBuilding({...venue,id:'answered-empty'},{fetcher:nothing}),null);assert.equal(overpass,0);
 const down=async url=>String(url).includes('reverse')?{ok:false,status:503}:(overpass++,{ok:true,json:async()=>({elements:[way({name:'Synthetic Hall'})]})});
 assert.equal((await lookupBuilding({...venue,id:'reverse-down'},{fetcher:down})).name,'Synthetic Hall');assert.equal(overpass,1);
});
