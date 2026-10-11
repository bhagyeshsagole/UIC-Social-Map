import {createResource} from './liveResource.js';
export function validFeed(data){return data?.schemaVersion===1&&Array.isArray(data.events)&&typeof data.fetchedAt==='string'&&Number.isFinite(Date.parse(data.fetchedAt));}
async function read(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Calendar unavailable');const data=await r.json();if(!validFeed(data))throw new Error('Invalid calendar');return data;}
export const campusFeed=createResource(()=>read(`${import.meta.env.BASE_URL}api/campus-events`),{interval:15*60000,storageKey:'kampuscape-public-feed-v2',maxAge:7*86400000,validate:validFeed});
let preload;
export function preloadEvents(){
 if(!preload){preload=read(`${import.meta.env.BASE_URL}campus-events.json`).then(feed=>campusFeed.seed(feed)).catch(()=>{});campusFeed.refresh();}
 return preload;
}
