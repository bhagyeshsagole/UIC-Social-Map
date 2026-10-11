import {createResource} from './liveResource.js';
import {supabase} from './auth/supabase.js';
import {registrationKey} from './registeredEvents';

// Attendance lives in Supabase (kampuscape_attendance) behind RPCs that return
// names and avatars only. Events are identified by a SHA-256 of the same stable
// key My Events uses, so a saved snapshot and the live listing match.
export async function attendanceKey(event) {
  const bytes = new TextEncoder().encode(registrationKey(event));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const resources=new Map();
const changed = () => {for(const resource of resources.values())resource.invalidate();window.dispatchEvent(new Event('kampuscape-attendance'));};
export function attendanceResource(event,userId){const key=`${userId||'guest'}:${registrationKey(event)}`;if(!resources.has(key))resources.set(key,createResource(()=>eventAttendees(event),{interval:30000}));return resources.get(key);}
export function ownAttendanceResource(userId){const key=`mine:${userId}`;if(!resources.has(key))resources.set(key,createResource(()=>myAttendance(),{interval:60000}));return resources.get(key);}
export function clearAttendance(userId){for(const [key,resource] of resources){if(key===`mine:${userId}`||key.startsWith(`${userId||'guest'}:`)){resource.clear();resources.delete(key);}}}
const call = async (fn, args, client) => {
  if (!client) throw new Error('Attendance is unavailable right now.');
  const {data, error} = await client.rpc(fn, args);
  if (error) throw new Error(error.code === '42501' ? 'Sign in with your UIC account first.' : 'Couldn’t update attendance. Please try again.');
  return data;
};
export async function attend(event, mode, client = supabase) {
  const [row] = await call('kampuscape_attend', {p_event_key:await attendanceKey(event), p_event_title:String(event.title || '').slice(0, 200), p_mode:mode}, client);
  changed();
  return row;
}
export async function leaveEvent(event, client = supabase) {
  await call('kampuscape_leave_event', {p_event_key:await attendanceKey(event)}, client);
  changed();
}
export async function eventAttendees(event, client = supabase) {
  if(!client)return [];
  const args={p_event_key:await attendanceKey(event)};
  const {data,error}=await client.rpc('kampuscape_event_contacts',args);
  if(error?.code==='PGRST202')return await call('kampuscape_event_attendees',args,client)||[];
  if(error)throw new Error('Couldn’t load attendees. Please retry.');
  return data||[];
}
export async function myAttendance(client = supabase) {
  const rows = await call('kampuscape_my_attendance', {}, client) || [];
  return new Map(rows.map(r => [r.event_key, r]));
}
