import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationKey,registrationSnapshot,readRegistered,readPending,registrationStorageKeys} from '../src/registeredEvents.js';
const event={title:'Synthetic festival',url:'https://example.test/event',start:'2026-10-07',end:'2026-11-01',place:{id:'synthetic-place'}};
test('external snapshots preserve details without claiming verified registration or becoming private events',()=>{
 const snapshot=registrationSnapshot(event);
 assert.equal(snapshot.source,'Shared event');assert.equal(snapshot.venue,null);assert.equal(snapshot.url,event.url);assert.ok(snapshot.when);
 assert.equal(registrationKey(snapshot),registrationKey(event));
 assert.equal(registrationSnapshot({...event,url:'javascript:alert(1)'}),null);
});
test('saved external events deduplicate and separate different dates and sources',()=>{
 const saved=registrationSnapshot(event);
 assert.equal(readRegistered([saved,saved,null]).length,1);
 assert.notEqual(registrationKey(event),registrationKey({...event,start:'2027-10-07'}));
 assert.notEqual(registrationKey({...event,id:'1',source:'UIC Connection'}),registrationKey({...event,id:'1',source:'Other'}));
 assert.deepEqual(readRegistered('invalid'),[]);
});
test('pending returns validate their snapshot and expire after a day',()=>{
 const pending={event:registrationSnapshot(event),at:100,departed:true};
 assert.ok(readPending(pending,200));assert.equal(readPending(pending,86400200),null);
 assert.equal(readPending({...pending,at:300},200),null);
 assert.equal(readPending({...pending,event:{}},200),null);
 assert.equal(readPending({...pending,departed:false},200).departed,false);
});

test('saved and pending events are isolated by account',()=>{
 const guest=registrationStorageKeys(),one=registrationStorageKeys('one'),two=registrationStorageKeys('two');
 assert.notEqual(guest.saved,one.saved);assert.notEqual(one.saved,two.saved);
 assert.notEqual(one.pending,two.pending);
});
