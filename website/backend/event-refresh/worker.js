import {fetchCampusEvents} from '../../frontend/scripts/campus-events.mjs';
import {campusMonth} from '../../frontend/src/campusEvents.js';
import locations from '../../frontend/src/campus-event-locations.json';
export default {
 async scheduled(controller,env,ctx){
  const now=new Date(controller.scheduledTime);
  ctx.waitUntil((async()=>{const feed=await fetchCampusEvents(now,fetch,async()=>locations.events);await env.EVENT_CACHE.put(`campus:${campusMonth(now)}`,JSON.stringify(feed),{expirationTtl:7*86400});})());
 }
};
