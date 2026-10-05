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
