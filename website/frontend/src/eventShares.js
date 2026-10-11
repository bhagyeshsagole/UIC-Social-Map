import {supabase} from './auth/supabase.js';
import {cleanEvent} from './privateEvents.js';
export async function saveEventShare(event,client=supabase){
 if(!client)throw new Error('Sharing is being set up. Please try again soon.');
 const {data,error}=await client.rpc('kampuscape_share_event',{p_event:cleanEvent(event)});
 if(error||typeof data!=='string'||! /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(data))throw new Error(error?.code==='54000'?error.message:'Couldn’t create the share preview. Please try again.');
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('kampuscape-share-created',{detail:{eventId:event.id,shareToken:data}}));
 return data;
}
export async function fetchEventShare(token,client=supabase){
 if(!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(token))throw new Error('This event link is invalid.');
 if(!client)throw new Error('Event sharing is temporarily unavailable.');
 const {data,error}=await client.rpc('kampuscape_shared_event',{p_token:token});
 if(error)throw new Error('Couldn’t load the shared event. Please try again.');
 const event=cleanEvent(data);if(!event)throw new Error('This event link has expired or was removed.');return event;
}
export async function revokeEventShare(event,client=supabase){
 if(!client)return;
 const {error}=await client.rpc('kampuscape_revoke_share',{p_event_id:event.id});
 if(error)throw new Error('Couldn’t remove the share link. Your event has not been deleted. Please retry.');
}
export const shareUrl=(token,base=window.location.origin)=>`${new URL(base).origin}/uic/share/${token}`;
