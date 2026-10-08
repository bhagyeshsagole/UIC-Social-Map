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
 assert.deepEqual(detailsFromReverse(venue,{name:'Synthetic Hall',address:{house_number:'12',road:'Test Street'},geojson:roof}),{name:'Synthetic Hall',address:'12 Test Street'});
 assert.deepEqual(detailsFromReverse(venue,{name:'',address:{house_number:'12',road:'Test Street'},geojson:{type:'Point',coordinates:[.0005,.0005]}}),{name:'12 Test Street',address:'12 Test Street'});
 assert.equal(detailsFromReverse(venue,{name:'Corner shop',geojson:{type:'Point',coordinates:[.003,.003]}}),null,'nearby point outside the roof');
 assert.equal(detailsFromReverse(venue,{name:'',address:{road:'Test Street'},geojson:roof}),null,'street alone is not an address');
 let overpass=0;
 const fetcher=async url=>String(url).includes('reverse')?{ok:true,json:async()=>({name:'Synthetic Hall',address:{},geojson:roof})}:(overpass++,{ok:true,json:async()=>({elements:[]})});
 assert.equal((await lookupBuilding({...venue,id:'reverse-hit'},{fetcher})).name,'Synthetic Hall');
 assert.equal(overpass,0,'Overpass is skipped when the fast lookup matches');
});
