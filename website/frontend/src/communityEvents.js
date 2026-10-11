import {createResource} from './liveResource.js';
import {supabase} from './auth/supabase.js';
import {cleanEvent} from './privateEvents';

// Public member events, readable by everyone with the host's public profile name
// and avatar (never their account ID or email). Publishing needs a verified member.
const fail = (error, fallback) => new Error(error?.code === '54000' || error?.code === '22023' ? error.message : fallback);
export async function fetchCommunityEvents(client = supabase) {
  if (!client) return [];
  const {data, error} = await client.rpc('kampuscape_public_events');
  if (error) throw fail(error, 'Couldn’t load community events.');
  return (data || []).map(row => {
    const event = cleanEvent({...row, source:'Private event', visibility:'public'});
    return event && {...event, host:row.host_name ? {name:String(row.host_name).slice(0, 60), avatar:row.host_avatar} : null};
  }).filter(Boolean);
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

export const communityFeed=createResource(()=>fetchCommunityEvents(),{interval:60000,storageKey:'kampuscape-community-feed-v1',maxAge:3600000,validate:data=>Array.isArray(data)&&data.every(e=>cleanEvent(e))});
