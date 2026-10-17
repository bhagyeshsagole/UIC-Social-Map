import test from 'node:test';import assert from 'node:assert/strict';import {placeLabel} from '../src/labelPlacement.js';
const view={left:0,top:0,right:400,bottom:400},size={width:130,height:30};
test('name box avoids nearby pins without hiding or moving those pins',()=>{
 const anchor={left:150,top:150,right:200,bottom:200},neighbor={left:200,top:130,right:350,bottom:230};
 const result=placeLabel(anchor,size,view,[neighbor]);assert.ok(result.left+size.width<neighbor.left||result.top+size.height<neighbor.top||result.top>neighbor.bottom);
});
test('name box stays within the viewport at edges',()=>{
 for(const anchor of [{left:370,top:0,right:400,bottom:30},{left:0,top:370,right:30,bottom:400}]){
  const result=placeLabel(anchor,size,view);assert.ok(result.left>=8&&result.top>=8);assert.ok(result.left+size.width<=392&&result.top+size.height<=392);
 }
});
import {groundTest,buildingMask} from '../src/labelPlacement.js';
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const day=groundTest(['#e3e3dc','#b9c8af','#acc6cf','#faf8ee','#c5c8c6']),night=groundTest(['#292f3b','#394a48','#1d3544','#626b7e','#343e50']);
test('flat map colours and their blends read as ground; lit buildings do not, by day and at night',()=>{
 for(const c of ['#e3e3dc','#faf8ee','#c5c8c6','#b9c8af','#acc6cf','#eeeee5'])assert.ok(day(...hex(c)),c);
 for(const c of ['#c7b9a6','#776f63','#b5263b','#7944bb','#c49a22','#9d8f7c'])assert.ok(!day(...hex(c)),c);
 for(const c of ['#292f3b','#626b7e','#343e50','#394a48','#1d3544','#454d5c'])assert.ok(night(...hex(c)),c);
 for(const c of ['#5a505a','#504050','#605060','#9f263b','#7542bb'])assert.ok(!night(...hex(c)),c);
});
test('building share under a box comes from the mask, scaled to the canvas',()=>{
 // 4×2 mask: the left half is building.
 const px=new Uint8Array(4*2*4);for(let y=0;y<2;y++)for(let x=0;x<4;x++){const i=(y*4+x)*4;px.set(x<2?hex('#c7b9a6'):hex('#e3e3dc'),i);px[i+3]=255;}
 const cover=buildingMask(px,4,2,{left:100,top:50,width:400,height:200},day);
 assert.equal(cover({left:100,top:50,right:300,bottom:250}),1);
 assert.equal(cover({left:300,top:50,right:500,bottom:250}),0);
 assert.equal(cover({left:200,top:50,right:400,bottom:250}),.5);
});
test('a name prefers the side over open ground when pins allow it',()=>{
 const anchor={left:180,top:180,right:200,bottom:200},roofRight=b=>b.left>=200?1:0;
 const result=placeLabel(anchor,{width:60,height:14},view,[],[6],roofRight);assert.ok(result.left+60<=anchor.left);assert.equal(result.roof,0);
});
