import {fetchCampusEvents} from '../../../scripts/campus-events.mjs';
import {campusMonth} from '../../../src/campusEvents.js';
import locations from '../../../src/campus-event-locations.json';
import {serveFeed} from '../../../server/feedCache.js';
export async function onRequestGet(context){
 const now=new Date();
 return serveFeed({...context,cache:caches.default,month:campusMonth(now),now:+now,load:()=>fetchCampusEvents(now,fetch,async()=>locations.events)});
}
