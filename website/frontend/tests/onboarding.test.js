import test from 'node:test';
import assert from 'node:assert/strict';
import {isUicEmail,isEligibleUser,validateProfile} from '../src/auth/profile.js';
import {classifyEvent,rankEvents,INTEREST_IDS} from '../src/interests.js';
import {tagFeed} from '../scripts/tag-event-interests.mjs';

test('exact UIC email domain rejects lookalikes, subdomains and malformed addresses',()=>{
 for(const email of ['person@uic.edu',' PERSON@UIC.EDU ','a+b@uic.edu'])assert.ok(isUicEmail(email),email);
 for(const email of ['person@gmail.com','person@uic.edu.evil.com','person@dept.uic.edu','person@uic.edu@evil.com','person@uıc.edu','@uic.edu','person @uic.edu','x\n@uic.edu','person@uic.edu\nother',null])assert.equal(isUicEmail(email),false,String(email));
});
test('metadata claiming verification cannot grant membership',()=>{
 const user={id:'a',email:'test@uic.edu',user_metadata:{email_verified:true}};
 assert.equal(isEligibleUser(user),false);
 assert.equal(isEligibleUser({...user,email_confirmed_at:'2026-10-07T12:00:00Z'}),true);
 assert.equal(isEligibleUser({...user,email:'test@gmail.com',email_confirmed_at:'2026-10-07T12:00:00Z'}),false);
 assert.equal(isEligibleUser({...user,email_confirmed_at:'2026-10-07T12:00:00Z',is_anonymous:true}),false);
});
test('profile validates a bounded catalog and optional pronouns',()=>{
 const profile={display_name:'  Example User ',pronouns:'',avatar_id:'cat',interests:['music','arts','music']};
 assert.deepEqual(validateProfile(profile),{...profile,display_name:'Example User',interests:['music','arts']});
 for(const patch of [{display_name:' '},{display_name:'x'.repeat(61)},{pronouns:'x'.repeat(41)},{avatar_id:'https://external.example/avatar'},{interests:[]},{interests:['unknown']},{interests:INTEREST_IDS}])assert.throws(()=>validateProfile({...profile,...patch}));
});
test('event classifier matches bounded words and never invents tags for unknown content',()=>{
 assert.deepEqual(classifyEvent({title:'Jazz & coffee social'}),['music','food','social']);
 assert.deepEqual(classifyEvent({title:'Department appointment'}),[]);
 assert.deepEqual(classifyEvent({title:'Career fair',user_metadata:{interests:['music']}}),['career']);
 assert.deepEqual(classifyEvent({title:'Gallery exhibition',place:{category:'Arts & culture'}}),['arts']);
});
test('recommendations use interest overlap, exclude expired events, deduplicate and retain date-only events through Chicago midnight',()=>{
 const now=new Date('2026-10-08T01:00:00Z');
 const events=[{id:'a',title:'Jazz concert',start:'2026-10-09T18:00:00Z',end:'2026-10-09T20:00:00Z'},
  {id:'b',title:'Music and art',start:'2026-10-10T18:00:00Z',end:'2026-10-10T20:00:00Z'},
  {id:'c',title:'Gallery exhibition',start:'2026-10-01',end:'2026-10-07'},
  {id:'d',title:'Expired jazz',start:'2026-10-01',end:'2026-10-06'},
  {id:'e',title:'Sports',start:'2026-10-10',end:'2026-10-11'}];
 assert.deepEqual(rankEvents([...events,events[0]],['music','arts'],now).map(r=>r.event.id),['b','c','a']);
 assert.deepEqual(rankEvents(events,[],now),[]);
 assert.deepEqual(rankEvents(events,['not-an-interest'],now),[]);
 assert.equal(rankEvents(events,['arts'],new Date('2026-10-08T06:00:00Z')).some(r=>r.event.id==='c'),false);
});
test('tagging pipeline preserves event facts, replaces stale tags and rejects invalid feeds',()=>{
 const feed={schemaVersion:1,fetchedAt:'2026-10-07T00:00:00Z',events:[{id:'a',title:'Chess meetup',url:'https://example.com/a',interestIds:['arts']}]};
 const result=tagFeed(feed);
 assert.deepEqual(result.events[0].interestIds,['gaming','social']);
 assert.equal(result.events[0].url,feed.events[0].url);assert.equal(result.fetchedAt,feed.fetchedAt);
 assert.deepEqual(feed.events[0].interestIds,['arts']);
 assert.throws(()=>tagFeed({events:[]}));
});
