import {cleanEvent} from './privateEvents.js';
import {eventTime} from './search.js';
export const REGISTERED_KEY='afterclass-registered-events';
export const PENDING_KEY='afterclass-registration-return';
export function registrationKey(event) {
  return event.registrationKey || JSON.stringify(event.id ? [event.source || '',event.id] : [event.url,event.title,event.start,event.end,event.place?.id]);
}
export function registrationSnapshot(event) {
  const snapshot=cleanEvent({...event,id:event.id || `${event.place?.id || 'external'}:${event.start || ''}:${event.end || ''}:${event.title}`,source:'Shared event',when:eventTime(event)});
  return snapshot?.url ? {...snapshot,registrationKey:registrationKey(event)} : null;
}
export function readRegistered(value) {
  if(!Array.isArray(value))return [];
  const result=new Map();
  for(const item of value){
    if(typeof item?.registrationKey!=='string'||item.registrationKey.length>4000)continue;
    const event=cleanEvent({...item,source:'Shared event'});
    if(event?.url)result.set(item.registrationKey,{...event,registrationKey:item.registrationKey});
  }
  return [...result.values()];
}
export function readPending(value,now=Date.now()) {
  if(!value || !Number.isFinite(value.at) || now-value.at>86400000 || value.at>now)return null;
  const [event]=readRegistered([value.event]);
  return event?{event,at:value.at,departed:value.departed===true}:null;
}
