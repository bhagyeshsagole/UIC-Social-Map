import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {VectorTile,classifyRings} from '@mapbox/vector-tile';
import {PbfReader as Pbf} from 'pbf';
import encode from 'vt-pbf';
import clipping from 'polygon-clipping';
import {bounds,overlaps,matchFootprint} from './event-geometry.mjs';
const registry=JSON.parse(await fs.readFile(new URL('../src/event-venues.json',import.meta.url)));
const campus=JSON.parse(await fs.readFile(new URL('../src/uic-tile-index.json',import.meta.url)));
const z=14, n=2**z;
const tileOf=([lng,lat])=>[Math.floor((lng+180)/360*n),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)];
const keys=new Set(campus.tiles);
for(const venue of registry.venues.filter(v=>v.kind!=='outdoor')){const [x,y]=tileOf(venue.coords);keys.add(`${z}/${x}/${y}`);}
const tiles=[],parts=[];
for(const key of keys){
  const [,x,y]=key.split('/').map(Number);
  let bytes;
  if(campus.tiles.includes(key)) bytes=await fs.readFile(new URL(`../public/uic-tiles/${key.replaceAll('/','-')}.pbf`,import.meta.url));
  else {
    const cache=`/tmp/uic-event-source-${campus.revision}-${key.replaceAll('/','-')}.pbf`;
    try { bytes=await fs.readFile(cache); } catch {
      const response=await fetch(campus.source.replace('{z}',z).replace('{x}',x).replace('{y}',y),{signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error(`Tile ${key}: ${response.status}`);
      bytes=new Uint8Array(await response.arrayBuffer());
      await fs.mkdir(new URL('../public/event-tiles/',import.meta.url),{recursive:true});await fs.writeFile(cache,bytes);
    }
  }
  const tile=new VectorTile(new Pbf(bytes)),layer=tile.layers.building,entries=[];
  if(!layer)continue;
  for(let i=0;i<layer.length;i++){
    const f=layer.feature(i),g=f.toGeoJSON(x,y,z).geometry,polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
    const native=classifyRings(f.loadGeometry());
    for(let j=0;j<polygons.length;j++){const part={polygon:polygons[j],bbox:bounds(polygons[j]),native:native[j],properties:{...f.properties},venueIds:[]};parts.push(part);entries.push(part);}
  }
  tiles.push({key,tile,layer,entries});
}
const matches=[];
for(const venue of registry.venues){
  if(venue.kind==='outdoor')continue;
  const match=matchFootprint(venue.coords,parts.map(p=>p.polygon));
  if(!match){console.log('No footprint:',venue.name);continue;}
  const bbox=bounds(match.polygon);let count=0;
  for(const part of parts){if(overlaps(part.bbox,bbox)&&clipping.intersection(part.polygon,match.polygon).length){part.venueIds.push(venue.id);count++;}}
  matches.push({id:venue.id,parts:count,method:match.distance===0?'contains source point':`source point ${match.distance.toFixed(1)}m from roof (entrance/courtyard)`});
}
const revision=createHash('sha256');
await fs.mkdir(new URL('../public/event-tiles/',import.meta.url),{recursive:true});
for(const {key,tile,layer,entries} of tiles){
  const split=entries.map((p,id)=>({id,type:3,properties:{...p.properties,event_venues:p.venueIds.map(id=>`|${id}|`).join('')},loadGeometry:()=>p.native}));
  tile.layers.building={name:layer.name,version:layer.version,extent:layer.extent,length:split.length,feature:i=>split[i]};
  const bytes=encode(tile);revision.update(bytes);await fs.writeFile(new URL(`../public/event-tiles/${key.replaceAll('/','-')}.pbf`,import.meta.url),bytes);
}
await fs.writeFile(new URL('../src/event-tile-index.json',import.meta.url),JSON.stringify({revision:revision.digest('hex').slice(0,12),campusRevision:campus.revision,source:campus.source,checked:registry.checked,tiles:tiles.map(t=>t.key),matches},null,2)+'\n');
console.log(`Built ${tiles.length} tiles; ${matches.length} matched venues.`);
