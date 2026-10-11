// One request/timer per resource, even when many cards subscribe. Cached data
// stays visible during refresh failures; hidden/offline pages stop polling.
export function createResource(loader, {interval=60000, storageKey, maxAge=86400000, clock=()=>Date.now(),validate=()=>true}={}) {
 let data, error=null, updatedAt=0, pending=null, timer=null, failures=0, version=0;
 const listeners=new Set();
 try {const saved=storageKey&&JSON.parse(localStorage.getItem(storageKey));if(saved&&clock()-saved.at<maxAge&&saved.at<=clock()&&validate(saved.data)){data=saved.data;updatedAt=saved.at;}}catch{}
 let snapshot={data,error,updatedAt,loading:false};
 const emit=()=>{snapshot={data,error,updatedAt,loading:!!pending};listeners.forEach(fn=>fn());};
 const active=()=>typeof document==='undefined'||(document.visibilityState!=='hidden'&&navigator.onLine!==false);
 const refresh=({force=false}={})=>{
  if(pending)return pending;
  if(!force&&data!==undefined&&clock()-updatedAt<interval)return Promise.resolve(data);
  const generation=version;
  pending=Promise.resolve().then(loader).then(value=>{
   if(generation!==version)return value;
   data=value;error=null;updatedAt=clock();failures=0;
   try{if(storageKey)localStorage.setItem(storageKey,JSON.stringify({at:updatedAt,data}));}catch{}
   return data;
  }).catch(e=>{if(generation===version){error=e;failures++;}return data;}).finally(()=>{if(generation===version){pending=null;emit();schedule();}});
  emit();return pending;
 };
 const schedule=()=>{clearTimeout(timer);if(listeners.size&&active())timer=setTimeout(()=>{if(active())refresh({force:true});},Math.min(interval*2**failures,Math.max(interval,300000)));};
 const resume=()=>{if(active()){refresh();schedule();}else clearTimeout(timer);};
 const subscribe=listener=>{
  listeners.add(listener);
  if(listeners.size===1){if(typeof window!=='undefined'){window.addEventListener('focus',resume);window.addEventListener('online',resume);window.addEventListener('offline',resume);document.addEventListener('visibilitychange',resume);}if(active())refresh();schedule();}
  return()=>{listeners.delete(listener);if(!listeners.size){clearTimeout(timer);if(typeof window!=='undefined'){window.removeEventListener('focus',resume);window.removeEventListener('online',resume);window.removeEventListener('offline',resume);document.removeEventListener('visibilitychange',resume);}}};
 };
 return {subscribe,getSnapshot:()=>snapshot,refresh,seed(value){if(data===undefined){data=value;emit();}},invalidate(){updatedAt=0;return listeners.size?refresh({force:true}):Promise.resolve(data);},clear(){clearTimeout(timer);version++;pending=null;data=undefined;updatedAt=0;error=null;failures=0;emit();}};
}
