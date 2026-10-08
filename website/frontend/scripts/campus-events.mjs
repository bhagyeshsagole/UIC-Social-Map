import {readFile, writeFile, rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {tagEvent,TAGGER_VERSION} from '../src/interests.js';
import {addCampusLocations, calendarFeedUrl, campusMonth, parseCampusFeed, upcomingCampusEvents, CAMPUS_CALENDAR} from '../src/campusEvents.js';
import {mergeEvents, parseIcs} from '../../data/importers/uic-connections-importer.mjs';

// Hassan's B11 parser reads the official calendar file, which lists some locations the JSON feed omits.
const CALENDAR_FILE = 'https://uic.campusgroups.com/ical/uic/ical_uic.ics';
async function calendarLocations(fetcher) {
  try {
    const response = await fetcher(CALENDAR_FILE, {headers:{Accept:'text/calendar'}, signal:AbortSignal.timeout(20000)});
    return response.ok ? mergeEvents(parseIcs(await response.text()), CALENDAR_FILE).events : [];
  } catch { return []; }
}
const locationNotes = async () => JSON.parse(await readFile(new URL('../src/campus-event-locations.json', import.meta.url))).events;

// `notes` is injectable because the Cloudflare Pages Function has no filesystem.
export async function fetchCampusEvents(now = new Date(), fetcher = fetch, notes = locationNotes) {
  const calendar = calendarLocations(fetcher);
  const response = await fetcher(calendarFeedUrl(now), {signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`Calendar request failed (${response.status}).`);
  const parsed = parseCampusFeed(JSON.parse(await response.text()));
  if (parsed.skippedCount) throw new Error(`Calendar schema changed: ${parsed.skippedCount} invalid event records. Keeping the previous snapshot.`);
  const events = addCampusLocations(upcomingCampusEvents(parsed.events, now), await calendar, await notes());
  return {schemaVersion:1, source:CAMPUS_CALENDAR, fetchedAt:new Date().toISOString(), month:campusMonth(now),
    sourceCount:parsed.sourceCount, interestTaggerVersion:TAGGER_VERSION, events:events.map(tagEvent)};
}

// Same-origin endpoint in local development and Vite preview. Production serves
// the same data from functions/api/campus-events.js on Cloudflare Pages.
export function campusEventsPlugin() {
  let cached, pending;
  const middleware = async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/campus-events') return next();
    if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
    const now = new Date();
    try {
      if (!cached || cached.month !== campusMonth(now) || +now - Date.parse(cached.fetchedAt) > 15 * 60000) {
        pending ??= fetchCampusEvents(now).finally(() => { pending = null; });
        cached = await pending;
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(cached));
    } catch {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({error:'UIC Connection is temporarily unavailable.'}));
    }
  };
  return {name:'campus-events', configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); }};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const now = new Date();
    const result = await fetchCampusEvents(now);
    const temp = new URL('../public/campus-events.json.tmp', import.meta.url);
    await writeFile(temp, JSON.stringify(result, null, 2) + '\n');
    await rename(temp, new URL('../public/campus-events.json', import.meta.url));
    console.log(`Imported ${result.events.length} upcoming events from ${result.month} on (${result.sourceCount} source listings).`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
