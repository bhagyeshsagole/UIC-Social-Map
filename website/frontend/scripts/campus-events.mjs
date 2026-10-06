import {writeFile, rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {calendarFeedUrl, campusMonth, parseCampusFeed, upcomingCampusEvents, CAMPUS_CALENDAR} from '../src/campusEvents.js';

export const snapshotPath = new URL('../public/campus-events.json', import.meta.url);
export async function fetchCampusEvents(now = new Date(), fetcher = fetch) {
  const response = await fetcher(calendarFeedUrl(now), {signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`Calendar request failed (${response.status}).`);
  const parsed = parseCampusFeed(JSON.parse(await response.text()));
  if (parsed.skippedCount) throw new Error(`Calendar schema changed: ${parsed.skippedCount} invalid event records. Keeping the previous snapshot.`);
  return {schemaVersion:1, source:CAMPUS_CALENDAR, fetchedAt:new Date().toISOString(), month:campusMonth(now),
    sourceCount:parsed.sourceCount, events:upcomingCampusEvents(parsed.events, now)};
}

// Same-origin endpoint in both local development and Vite preview. A future
// production backend can reuse fetchCampusEvents; static hosting uses the snapshot.
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
    await rename(temp, snapshotPath);
    console.log(`Imported ${result.events.length} upcoming events from ${result.month} on (${result.sourceCount} source listings).`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
