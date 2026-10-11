import {supabase} from './auth/supabase.js';
import {createResource} from './liveResource.js';
export async function messageCall(name,args={},client=supabase){
 if(!client)throw new Error('Messaging is being set up. Please try again soon.');
 const {data,error}=await client.rpc(`kampuscape_${name}`,args);
 if(error)throw new Error(['54000','22023'].includes(error.code)?error.message:error.code==='PGRST202'?'Messaging is being set up. Please try again soon.':'This conversation is unavailable. Refresh and try again.');
 return data;
}
const inboxes=new Map();
export function inboxResource(userId){
 if(!inboxes.has(userId))inboxes.set(userId,createResource(()=>userId?messageCall('message_inbox'):[],{interval:15000}));
 return inboxes.get(userId);
}
export function clearMessages(userId){inboxes.get(userId)?.clear();inboxes.delete(userId);}
