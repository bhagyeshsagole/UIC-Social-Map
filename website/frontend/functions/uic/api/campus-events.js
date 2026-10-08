import {fetchCampusEvents} from '../../../scripts/campus-events.mjs';
import {campusMonth} from '../../../src/campusEvents.js';
import locations from '../../../src/campus-event-locations.json';

// Production twin of the Vite dev middleware: the same feed, cached at the edge
// for 15 minutes (and per Chicago month) so visitors don't each hit UIC Connection.
const TTL = 15 * 60;
const json = (body, status = 200) => new Response(body, {status, headers:{'Content-Type':'application/json', 'Cache-Control':'no-store'}});

export async function onRequestGet({request, waitUntil}) {
  const now = new Date();
  const key = new Request(new URL(`/uic/api/campus-events?month=${campusMonth(now)}`, request.url));
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return json(await hit.text());
  try {
    const body = JSON.stringify(await fetchCampusEvents(now, fetch, async () => locations.events));
    waitUntil(cache.put(key, new Response(body, {headers:{'Content-Type':'application/json', 'Cache-Control':`public, max-age=${TTL}`}})));
    return json(body);
  } catch {
    return json(JSON.stringify({error:'UIC Connection is temporarily unavailable.'}), 503);
  }
}
