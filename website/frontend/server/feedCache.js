export const FRESH_MS=15*60000,MAX_STALE_MS=7*86400000;
const inflight=new Map();
const valid=data=>data?.schemaVersion===1&&Array.isArray(data.events)&&Number.isFinite(Date.parse(data.fetchedAt));
const age=(data,now)=>now-Date.parse(data.fetchedAt);
export async function serveFeed({request,waitUntil,env={},cache,load,month,now=Date.now()}){
 const key=new Request(new URL(`/uic/api/campus-events?month=${month}`,request.url));
 const storeKey=`campus:${month}`;
 let cached;
 try{const hit=await cache.match(key);if(hit)cached=await hit.json();}catch{}
 if(!valid(cached)&&env.EVENT_CACHE){try{cached=await env.EVENT_CACHE.get(storeKey,'json');}catch{}}
 if(!valid(cached)||age(cached,now)>MAX_STALE_MS||age(cached,now)<-60000)cached=null;
 const response=(data,stale=false)=>Response.json(data,{headers:{'Cache-Control':'public, max-age=60','X-Kampuscape-Cache':stale?'stale':'fresh'}});
 const refresh=()=>{
  if(!inflight.has(storeKey)){
   const pending=Promise.resolve().then(load).then(async data=>{
    if(!valid(data))throw new Error('Invalid feed');
    await Promise.allSettled([cache.put(key,new Response(JSON.stringify(data),{headers:{'Cache-Control':`public, max-age=${MAX_STALE_MS/1000}`}})),...(env.EVENT_CACHE?[env.EVENT_CACHE.put(storeKey,JSON.stringify(data),{expirationTtl:MAX_STALE_MS/1000})]:[])]);
    return data;
   }).finally(()=>inflight.delete(storeKey));inflight.set(storeKey,pending);
  }return inflight.get(storeKey);
 };
 if(cached){if(age(cached,now)>FRESH_MS)waitUntil(refresh().catch(()=>{}));return response(cached,age(cached,now)>FRESH_MS);}
 try{return response(await refresh());}catch{return Response.json({error:'UIC Connection is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
