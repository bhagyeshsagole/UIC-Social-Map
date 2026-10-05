import test from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import {area,cleanCampusParts} from '../scripts/campus-geometry.mjs';
const box=(x,y,w,h,height,uic=false)=>({rings:[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]],uic,properties:{render_height:height,render_min_height:0}});
test('campus roofs become non-overlapping steps while preserving the footprint and tower height',()=>{
 const parts=cleanCampusParts([box(0,0,10,10,10,true),box(3,3,4,4,30)]);
 assert.equal(parts.length,2);assert.ok(parts.every(p=>p.uic));
 assert.equal(area(clipping.intersection(parts[0].rings,parts[1].rings)),0);
 assert.equal(parts.reduce((sum,p)=>sum+area([p.rings]),0),100);
 assert.equal(area([parts.find(p=>p.properties.render_height===30).rings]),16);
});
test('coplanar campus parts merge without recoloring separate neighbors',()=>{
 const parts=cleanCampusParts([box(0,0,10,10,10,true),box(5,0,10,10,10),box(30,0,10,10,10)]);
 const campus=parts.filter(p=>p.uic);assert.equal(campus.length,1);
 assert.equal(area([campus[0].rings]),150);assert.equal(parts.filter(p=>!p.uic).length,1);
});
test('courtyard holes remain open after roof consolidation',()=>{
 const courtyard=box(0,0,10,10,10,true);courtyard.rings.push([[3,3],[3,7],[7,7],[7,3],[3,3]]);
 const parts=cleanCampusParts([courtyard]);assert.equal(area([parts[0].rings]),84);assert.equal(parts[0].rings.length,2);
});

test('connected wings join campus buildings while point contacts and gaps stay separate',()=>{
 const parts=cleanCampusParts([box(0,0,10,10,10,true),box(10,0,10,10,10),box(20,10,10,10,10),box(0,11,10,10,10)]);
 const campus=parts.filter(p=>p.uic);assert.equal(campus.length,1);assert.equal(area([campus[0].rings]),200);assert.equal(parts.filter(p=>!p.uic).length,2);
});
test('buffered copies and split wings across tile seams form one continuous building',()=>{
 const parts=cleanCampusParts([box(0,0,11,10,10,true),box(9,0,11,10,10),box(0,0,11,10,10)]);
 assert.equal(parts.length,1);assert.ok(parts[0].uic);assert.equal(area([parts[0].rings]),200);
});
