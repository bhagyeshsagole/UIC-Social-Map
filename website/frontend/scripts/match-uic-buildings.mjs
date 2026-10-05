import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {VectorTile,classifyRings} from '@mapbox/vector-tile';
import encode from 'vt-pbf';
import clipping from 'polygon-clipping';
import {cleanCampusParts} from './campus-geometry.mjs';
import {PbfReader as Pbf} from 'pbf';
const registry=JSON.parse(await fs.readFile(new URL('../src/uic-buildings.json',import.meta.url)));
const manifest=await (await fetch('https://tiles.openfreemap.org/planet')).json();
const z=14,n=2**z;
const tileOf=([lng,lat])=>[Math.floor((lng+180)/360*n),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)];
const keys=new Map();
for(const b of registry.buildings){const [x,y]=tileOf(b.coordinates);keys.set(`${x}/${y}`,[x,y]);}
const features=[],tiles=[];
for(const [x,y] of keys.values()){
 const url=manifest.tiles[0].replace('{z}',z).replace('{x}',x).replace('{y}',y);
 const response=await fetch(url);if(!response.ok)throw new Error(`${response.status} ${url}`);
 const tile=new VectorTile(new Pbf(new Uint8Array(await response.arrayBuffer())));
 tiles.push({x,y,tile});
 const buildings=tile.layers.building;if(!buildings)continue;
 for(let i=0;i<buildings.length;i++){const feature=buildings.feature(i);const f=feature.toGeoJSON(x,y,z);const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const coordinates of polygons)features.push({...f,geometry:{type:'Polygon',coordinates}});}
}
function inside([x,y],ring){let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;}return result;}
function contains(p,g){const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polys.some(poly=>inside(p,poly[0])&&!poly.slice(1).some(hole=>inside(p,hole)));}
function distance(p,g){let best=Infinity;const rings=g.type==='Polygon'?g.coordinates:g.coordinates.flat();const sx=111320*Math.cos(p[1]*Math.PI/180),sy=111320;for(const ring of rings){for(let i=1;i<ring.length;i++){const a=[(ring[i-1][0]-p[0])*sx,(ring[i-1][1]-p[1])*sy],b=[(ring[i][0]-p[0])*sx,(ring[i][1]-p[1])*sy],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(a[0]+t*dx,a[1]+t*dy));}}return best;}
const matches=[],unmatched=[],selected=new Map();
for(const b of registry.buildings){let hits=features.filter(f=>contains(b.coordinates,f.geometry));let method='contains official point';if(!hits.length){const ranked=features.map(f=>({f,d:distance(b.coordinates,f.geometry)})).sort((a,b)=>a.d-b.d);if(ranked[0]?.d<=35){hits=[ranked[0].f];method=`nearest footprint (${ranked[0].d.toFixed(1)} m)`;}}
 for(const f of hits){const key=JSON.stringify(f.geometry);selected.set(key,f);}
 if(hits.length)matches.push({...b,ids:[...new Set(hits.map(f=>f.id))],method});else unmatched.push(b);
}
const ids=[...new Set(matches.flatMap(b=>b.ids))];
console.log(JSON.stringify({tiles:keys.size,footprints:features.length,matched:matches.length,ids:ids.length,missingIds:ids.filter(x=>x==null).length,unmatched,nearest:matches.filter(b=>b.method.startsWith('nearest')).map(b=>[b.name,b.method])},null,2));
if(ids.some(id=>id==null))throw new Error('Footprints lack stable IDs');
await fs.writeFile(new URL('../src/uic-building-matches.json',import.meta.url),JSON.stringify({source:registry.source,tiles:manifest.tiles[0],checked:'2026-10-05',ids,matches,unmatched},null,2));

// Re-encode each original tile once. Each footprint receives its own UIC
// property; no overlay or duplicate surfaces are rendered at runtime.
const root=new URL('../public/uic-tiles/',import.meta.url);
await fs.mkdir(root,{recursive:true});
const revision=createHash('sha256'),allParts=[];
// Clean in a single global tile-coordinate space so wings crossing tile edges
// share affiliation and geometry, including the source tiles' buffered copies.
for(const {x,y,tile} of tiles){
 const layer=tile.layers.building,extent=layer.extent;
 for(let i=0;i<layer.length;i++){
  const f=layer.feature(i),g=f.toGeoJSON(x,y,z).geometry;
  const coordinates=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  const native=classifyRings(f.loadGeometry());
  for(let j=0;j<native.length;j++){
   const key=JSON.stringify({type:'Polygon',coordinates:coordinates[j]});
   allParts.push({tileKey:`${x}/${y}`,properties:f.properties,uic:selected.has(key),rings:native[j].map(r=>r.map(p=>[p.x+x*extent,p.y+y*extent]))});
  }
 }
}
const cleaned=cleanCampusParts(allParts),campus=cleaned.filter(p=>p.uic);
for(const {x,y,tile} of tiles){
 const layer=tile.layers.building,extent=layer.extent,ox=x*extent,oy=y*extent;
 const box=[[[ox,oy],[ox+extent,oy],[ox+extent,oy+extent],[ox,oy+extent],[ox,oy]]];
 const parts=cleaned.filter(p=>!p.uic&&p.tileKey===`${x}/${y}`);
 for(const p of campus)for(const rings of clipping.intersection(p.rings,box))parts.push({...p,rings});
 const split=parts.map((p,id)=>({id,type:3,properties:{...p.properties,uic:p.uic},loadGeometry:()=>p.rings.map(r=>r.map(([px,py])=>({x:Math.round(px-ox),y:Math.round(py-oy)})))}));
 tile.layers.building={name:layer.name,version:layer.version,extent,length:split.length,feature:i=>split[i]};
 const encoded=encode(tile);revision.update(encoded);
 await fs.writeFile(new URL(`${z}-${x}-${y}.pbf`,root),encoded);
}
await fs.writeFile(new URL('../src/uic-tile-index.json',import.meta.url),JSON.stringify({revision:revision.digest('hex').slice(0,12),source:manifest.tiles[0],checked:'2026-10-05',tiles:tiles.map(({x,y})=>`${z}/${x}/${y}`)},null,2));
