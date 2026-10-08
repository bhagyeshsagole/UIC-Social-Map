import {supabase} from './auth/supabase.js';
import {cleanEvent} from './privateEvents';

// Public member events (kampuscape_community_events). Readable by verified UIC
// members only; the creator's identity is never returned.
const fail = (error, fallback) => new Error(error?.code === '54000' || error?.code === '22023' ? error.message : fallback);
export async function fetchCommunityEvents(client = supabase) {
  if (!client) return [];
  const {data, error} = await client.from('kampuscape_community_events').select('id,title,description,date,time,venue').order('date').order('time').limit(300);
  if (error) throw fail(error, 'Couldn’t load community events.');
  return (data || []).map(row => cleanEvent({...row, source:'Private event', visibility:'public'})).filter(Boolean);
}
export async function publishEvent(event, client = supabase) {
  if (!client) throw new Error('Publishing is unavailable right now.');
  const {id, title, description, date, time, venue} = event;
  const {error} = await client.from('kampuscape_community_events').insert({id, title, description, date, time, venue});
  if (error) throw fail(error, 'Couldn’t publish your event. It’s saved privately on this device.');
}
export async function unpublishEvent(event, client = supabase) {
  if (!client) return;
  const {error} = await client.from('kampuscape_community_events').delete().eq('id', event.id);
  if (error) throw fail(error, 'Couldn’t remove the public listing. Please try again.');
}
