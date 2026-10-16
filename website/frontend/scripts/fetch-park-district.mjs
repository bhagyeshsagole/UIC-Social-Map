// Weekly hours and a photo for Chicago Park District parks and fieldhouses, from each park's own page on
// chicagoparkdistrict.com. A page counts when OpenStreetMap links it or its title names the park. Respects
// robots.txt. Writes data/places/park-district.json, which import-nearby-places.mjs merges.
// Run from website/frontend: node scripts/fetch-park-district.mjs
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {robotsAllow} from './lib/robots.mjs';

const AGENT = 'Mozilla/5.0 (compatible; KampuscapeBot/1.0; +https://kampuscape.com/support)';
const HOST = 'https://www.chicagoparkdistrict.com';
const out = new URL('../../data/places/park-district.json', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('../../data/places/uic-nearby-osm.json', import.meta.url)));
const places = JSON.parse(readFileSync(new URL('../src/nearbyPlaces.json', import.meta.url))).places;
const tagsById = new Map(raw.elements.map(e => [`osm-${e.type}-${e.id}`, e.tags || {}]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Pages an editor matched by hand when OpenStreetMap's link is stale and the name is ambiguous (overrides.json → parkPages).
const pinned = JSON.parse(readFileSync(new URL('../../data/places/overrides.json', import.meta.url))).parkPages || {};
const get = async url => {const r = await fetch(url, {headers: {'User-Agent': AGENT}, redirect: 'follow', signal: AbortSignal.timeout(20000)}); return r.ok ? r.text() : '';};
const robots = await get(`${HOST}/robots.txt`);
const words = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !['park', 'the', 'no', 'number', 'playlot', 'field', 'fieldhouse'].includes(w));

// Every park page the district lists, from its sitemap.
const pages = [];
for (let i = 1; i <= 12; i++) {
  const xml = await get(`${HOST}/sitemap.xml?page=${i}`);
  if (!xml) break;
  pages.push(...[...xml.matchAll(/<loc>(https:\/\/www\.chicagoparkdistrict\.com\/parks-facilities\/[^<]+)<\/loc>/g)].map(m => m[1]));
}
const slugWords = new Map([...new Set(pages)].map(url => [url, url.split('/').pop().split('-').filter(w => !['park', 'playlot', 'no'].includes(w))]));

const minutes = (h, m, ap) => ((+h % 12) + (ap === 'pm' ? 12 : 0)) * 60 + +(m || 0);
function weeklyHours(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const schedule = days.map(day => {
    const m = text.match(new RegExp(`${day}: (?:(Closed)|(\\d{1,2}):(\\d{2}) ?([ap]m) ?- ?(\\d{1,2}):(\\d{2}) ?([ap]m))`, 'i'));
    if (!m) return undefined;
    if (m[1]) return null;
    const open = minutes(m[2], m[3], m[4].toLowerCase()), close = minutes(m[5], m[6], m[7].toLowerCase());
    return [open, close <= open ? close + 1440 : close];
  });
  return schedule.every(d => d !== undefined) ? schedule : null;
}

// A page that fails this run (the site sometimes answers with a bot check) keeps its last good result.
const previous = existsSync(out) ? JSON.parse(readFileSync(out)).places : {};
const results = {}, log = [];
for (const p of places.filter(p => ['Outdoors', 'Get active'].includes(p.category) && p.id.startsWith('osm-'))) {
  const t = tagsById.get(p.id) || {}, site = (t.website || t['contact:website'] || '').replace('/parks/', '/parks-facilities/').replace(/\/$/, '');
  // The page OpenStreetMap links comes first; a stale link falls back to the one sitemap page whose name matches.
  const want = words(p.name), named = [...slugWords].filter(([, slug]) => want.length && want.every(w => slug.includes(w)));
  const candidates = [...(pinned[p.id] ? [pinned[p.id]] : []), ...(site.startsWith(`${HOST}/parks-facilities/`) ? [site] : []), ...(named.length === 1 && (site.includes(HOST) || t.operator === 'Chicago Park District' || /fieldhouse|park district/i.test(p.name)) ? [named[0][0]] : [])];
  let page = null, html = '';
  for (const url of candidates) {
    if (!robotsAllow(robots, new URL(url).pathname)) continue;
    html = await get(url); await sleep(3000);
    if (html) {page = url; break;}
  }
  if (!page) {if (previous[p.id]) results[p.id] = previous[p.id]; if (candidates.length) log.push([p.id, previous[p.id] ? 'kept last good result' : 'no page', candidates.join(' ')]); continue;}
  const title = (html.match(/og:title" content="([^"]+)/) || [])[1] || '';
  if (!words(p.name).every(w => title.toLowerCase().includes(w))) {log.push([p.id, 'title mismatch', title]); continue;}
  const schedule = weeklyHours(html);
  const src = (html.match(/src="(https:\/\/files\.chicagoparkdistrict\.com\/styles\/[^"]+\.(?:jpe?g|png|webp)[^"]*)"/i) || [])[1];
  results[p.id] = {page, title, ...(schedule ? {schedule} : {}), ...(src ? {image: {src: src.replaceAll('&amp;', '&')}} : {})};
  log.push([p.id, schedule ? 'hours' : 'no hours', src ? 'photo' : 'no photo']);
}
writeFileSync(out, JSON.stringify({checked: new Date().toISOString().slice(0, 10), agent: AGENT, note: 'Weekly hours and a photo from each park’s own Chicago Park District page.', places: results, log}, null, 1) + '\n');
console.log('Park District pages:', Object.keys(results).length, 'with hours:', Object.values(results).filter(r => r.schedule).length, 'with photo:', Object.values(results).filter(r => r.image).length);
