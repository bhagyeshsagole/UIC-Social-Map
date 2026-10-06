import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
import {createExpression} from '@maplibre/maplibre-gl-style-spec';
import {addressKey,resolveEventVenue,eventBuildingColor,groupByVenue,buildingVenues} from '../src/eventLocations.js';
import {matchFootprint} from '../scripts/event-geometry.mjs';
const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url)));
const {venues}=read('../src/event-venues.json'), index=read('../src/event-tile-index.json');

test('public address matching handles punctuation and room numbers without guessing from a host or title',()=>{
  for(const location of ['750 S. Halsted, Suite 245, Chicago, IL, 60607','750 South Halsted Street Room 603, Chicago','750 S Halsted, Chicago']){
    assert.equal(addressKey(location),'750 s halsted');
    assert.equal(resolveEventVenue({location,hasPublicLocation:true},venues).id,'uic-0605');
  }
  assert.equal(resolveEventVenue({location:'SELE 2268, 950 S Halsted St, Chicago',hasPublicLocation:true},venues).id,'uic-0607');
  assert.equal(resolveEventVenue({location:'828 S Wolcott Ave, Chicago',hasPublicLocation:true},venues).id,'uic-0938');
  assert.equal(resolveEventVenue({title:'Party at Student Center East',location:'Location on UIC Connection',hasPublicLocation:false},venues),null);
  assert.equal(resolveEventVenue({location:'750 S Halsted, Chicago',hasPublicLocation:false},venues),null);
  assert.equal(resolveEventVenue({location:'12345 S Unknown St',hasPublicLocation:true},venues),null);
});
test('current public event venues all resolve; outdoor venues do not claim a building',()=>{
  const {events}=read('../public/campus-events.json');
  const matched=new Set(index.matches.map(m=>m.id));
  for(const e of events.filter(e=>e.hasPublicLocation)){
    const v=resolveEventVenue(e,venues);assert.ok(v,e.location);
    if(v.kind==='outdoor')assert.ok(!matched.has(v.id));else assert.ok(matched.has(v.id),v.name);
  }
  assert.equal(resolveEventVenue({place:{id:'gallery-400'}},venues).id,'uic-0641');
  assert.equal(resolveEventVenue({place:{id:'art-institute'}},venues).id,'art-institute');
});
test('event purple overrides UIC red, expires back to red, and leaves unrelated buildings neutral in either theme',()=>{
  for(const night of [false,true]){
    const evaluate=(ids,properties)=>{
      const expression=createExpression(eventBuildingColor(night,ids),'fill-extrusion-color',{type:'color'});
      assert.equal(expression.result,'success');
      return expression.value.evaluate({zoom:16},{type:3,properties:{render_height:25,...properties}}).toString();
    };
    const red=evaluate([],{uic:true,event_venues:'|uic-0605|'});
    const purple=evaluate(['uic-0605'],{uic:true,event_venues:'|uic-0605|'});
    assert.notEqual(red,purple);
    assert.equal(purple,evaluate(['uic-0605'],{uic:false,event_venues:'|uic-0605|'}));
    assert.equal(red,evaluate(['other'],{uic:true,event_venues:'|uic-0605|'}));
    assert.equal(evaluate([],{uic:false}),evaluate(['uic-0605'],{uic:false,event_venues:'|uic-06050|'}));
  }
});
test('local event tiles retain every UIC roof geometry and height while adding event affiliation',()=>{
  const campus=read('../src/uic-tile-index.json');assert.equal(index.campusRevision,campus.revision);
  const load=(folder,key)=>new VectorTile(new PbfReader(readFileSync(new URL(`../public/${folder}/${key.replaceAll('/','-')}.pbf`,import.meta.url)))).layers.building;
  let eventParts=0;
  for(const key of campus.tiles){
    const before=load('uic-tiles',key),after=load('event-tiles',key);
    assert.equal(after.length,before.length);
    for(let i=0;i<before.length;i++){
      const a=before.feature(i),b=after.feature(i);
      const {event_venues,...properties}=b.properties;
      assert.deepEqual(properties,{...a.properties});
      assert.deepEqual(b.loadGeometry(),a.loadGeometry());
      if(event_venues.includes('|uic-0605|'))eventParts++;
    }
  }
  assert.ok(eventParts>1,'SCE roof and tower parts all carry the venue tag');
});
test('footprint matching joins touching wings but never jumps across a street',()=>{
  const rect=(x,y,w,h)=>[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]];
  const buildings=[rect(-87.65,41.87,.0002,.0002),rect(-87.6498,41.87,.0002,.0002),rect(-87.6491,41.87,.0002,.0002)];
  const matched=matchFootprint([-87.64995,41.8701],buildings);
  assert.ok(matched);
  const lngs=matched.polygon[0].map(p=>p[0]);assert.ok(Math.max(...lngs)<-87.6492);
  assert.equal(matchFootprint([-87.66,41.88],buildings),null);
});
test('building previews group upcoming events by venue, soonest first, and ignore venues without events',()=>{
  const sce={id:'uic-0605',name:'UIC Student Center East'},sse={id:'uic-0607',name:'SELE'};
  const groups=groupByVenue([{title:'Late',start:'2026-10-09T15:00:00Z',venue:sce},{title:'Early',start:'2026-10-06T16:00:00Z',venue:sce},{title:'Lab',start:'2026-10-07T16:00:00Z',venue:sse},{title:'Private',start:'2026-10-06T16:00:00Z',venue:null}]);
  assert.deepEqual(Object.keys(groups).sort(),['uic-0605','uic-0607']);
  assert.deepEqual(groups['uic-0605'].events.map(e=>e.title),['Early','Late']);
  assert.deepEqual(buildingVenues('|uic-0605|uic-9999|',groups),['uic-0605']);
  assert.deepEqual(buildingVenues(undefined,groups),[]);
  assert.deepEqual(buildingVenues('|uic-06050|',groups),[]);
});
