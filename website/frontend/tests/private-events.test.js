import {readFileSync} from 'node:fs';
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createExpression} from '@maplibre/maplibre-gl-style-spec';
import {eventLink,readEventLink,cleanEvent,cleanVenue,buildingArea,footprintId} from '../src/privateEvents.js';
import {eventBuildingColor} from '../src/eventLocations.js';
const venue={id:'uic-0605',name:'Student Center East',coords:[-87.647964,41.871967]};
const event={id:'test-private',source:'Private event',title:'Dinner 🥙 & friends',date:'2026-12-20',time:'18:00',description:'Meet by the entrance.',venue};
test('private links carry Unicode details and precise venue without requiring local storage',()=>{
 const url=eventLink(event,'https://example.test/map/?x=1#old');const restored=readEventLink(new URL(url).hash);
 assert.equal(restored.error,'');assert.deepEqual(restored.event,cleanEvent(event));assert.equal(new URL(url).pathname,'/map/');
});
test('external event snapshots retain exact location and schedule; hidden locations remain hidden',()=>{
 const restored=readEventLink(new URL(eventLink({id:'public',title:'Campus event',venue,url:'https://uic.campusgroups.com/event'},'https://example.test/','Oct 7, 4pm')).hash).event;
 assert.equal(restored.when,'Oct 7, 4pm');assert.deepEqual(restored.venue.coords,venue.coords);
 assert.equal(readEventLink(new URL(eventLink({id:'hidden',title:'Hidden venue'},'https://example.test/','Tomorrow')).hash).event.venue,null);
});
test('links reject corrupt/oversized payloads, invalid dates, unsafe URLs, and invalid coordinates',()=>{
 for(const hash of ['#event=oops','#event='+ 'a'.repeat(24001),'#event=%invalid'])assert.ok(readEventLink(hash).error);
 assert.equal(cleanEvent({...event,date:'2026-02-30'}),null);assert.equal(cleanEvent({...event,time:'24:00'}),null);
 assert.equal(cleanEvent({...event,url:'javascript:alert(1)'}).url,undefined);
 assert.equal(cleanVenue({...venue,coords:[Infinity,42]}),null);assert.equal(cleanVenue({...venue,coords:[0,91]}),null);
 assert.equal(readEventLink('#other').error,'');
});
test('yellow takes precedence and deletion restores off-campus purple or campus red in both themes',()=>{
 for(const night of [false,true]){
  const color=(publicIds,privateVenues,uic=true)=>{
   const expression=createExpression(eventBuildingColor(night,publicIds,privateVenues),'fill-extrusion-color',{type:'color'});
   assert.equal(expression.result,'success');return expression.value.evaluate({zoom:16},{type:3,properties:{render_height:25,uic,event_venues:'|uic-0605|'}}).toString();
  };
  const red=color([],[]),purple=color(['uic-0605'],[]),yellow=color(['uic-0605'],[venue]);
  assert.notEqual(yellow,purple);assert.notEqual(yellow,red);assert.equal(yellow,color([],[venue]));assert.equal(color([],[]),red);
 }
});
test('custom building geometry survives sharing and compiles as a spatial color expression',()=>{
 const footprint={type:'Polygon',coordinates:[[[-87.648,41.8719],[-87.6479,41.8719],[-87.6479,41.872],[-87.648,41.872],[-87.648,41.8719]]]};
 const custom={...venue,id:'pin:custom',footprint};
 assert.ok(cleanVenue(custom));assert.deepEqual(readEventLink(new URL(eventLink({...event,venue:custom},'https://example.test')).hash).event.venue.footprint,footprint);
 assert.equal(createExpression(eventBuildingColor(false,[],[custom]),'fill-extrusion-color',{type:'color'}).result,'success');
 assert.ok(buildingArea(custom).coordinates[0][0][0]<footprint.coordinates[0][0][0]);
 assert.equal(cleanVenue({...custom,footprint:{type:'Point',coordinates:[0,0]}}),null);
});

test('custom roof identity survives a different click location and polygon ring order',()=>{
 const ring=[[-87.65,41.87],[-87.649,41.87],[-87.649,41.871],[-87.65,41.87]];
 assert.equal(footprintId({coordinates:[ring]}),footprintId({coordinates:[[...ring].reverse()]}));
 assert.notEqual(footprintId({coordinates:[ring]}),footprintId({coordinates:[ring.map(([x,y])=>[x+.01,y])]}));
});

test('actual polygon roofs turn yellow and reused tile feature IDs elsewhere do not',()=>{
 const canonical={z:14,x:4202,y:6090};
 const layer=new VectorTile(new PbfReader(readFileSync(new URL('../public/event-tiles/14-4202-6090.pbf',import.meta.url)))).layers.building;
 const roof=layer.feature(0),footprint=roof.toGeoJSON(canonical.x,canonical.y,canonical.z).geometry;
 const custom={id:'pin:regression',featureId:roof.id,name:'Synthetic roof',coords:footprint.coordinates[0][0],footprint};
 const feature={type:3,id:roof.id,properties:{...roof.properties,render_height:25},geometry:roof.loadGeometry().map(r=>r.map(p=>({x:p.x*8192/layer.extent,y:p.y*8192/layer.extent})))};
 const expression=createExpression(eventBuildingColor(false,[],[custom]),'fill-extrusion-color',{type:'color'});
 assert.equal(expression.result,'success');
 const selected=expression.value.evaluate({zoom:16},feature,{},canonical).toString();
 const elsewhere=expression.value.evaluate({zoom:16},feature,{}, {...canonical,x:canonical.x+5}).toString();
 assert.equal(selected,'rgba(237,200,67,1)');assert.notEqual(selected,elsewhere);
});
