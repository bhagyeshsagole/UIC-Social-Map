// Published hours for chain branches. A chain's store-locator sitemap is searched for the branch's
// street address; the store page counts only when its own address matches (schema.org data, or hours
// text next to that address). Respects robots.txt. Writes data/places/chain-hours.json, which
// import-nearby-places.mjs merges. Run from website/frontend: node scripts/fetch-chain-hours.mjs
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {parseOpeningHours, parseOpeningSpecification} from '../src/openingHours.js';
import {findHoursInPage} from './lib/hoursText.mjs';
import {robotsAllow} from './lib/robots.mjs';

const AGENT = 'Mozilla/5.0 (compatible; KampuscapeBot/1.0; +https://kampuscape.com/support)';
const out = new URL('../../data/places/chain-hours.json', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('../../data/places/uic-nearby-osm.json', import.meta.url)));
const places = JSON.parse(readFileSync(new URL('../src/nearbyPlaces.json', import.meta.url))).places;
const venues = existsSync(new URL('../../data/places/venue-websites.json', import.meta.url)) ? JSON.parse(readFileSync(new URL('../../data/places/venue-websites.json', import.meta.url))).places : {};
const tagsById = new Map(raw.elements.map(e => [`osm-${e.type}-${e.id}`, e.tags || {}]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, accept = 'text/html,application/xml,text/xml') {
  const response = await fetch(url, {headers: {'User-Agent': AGENT, Accept: accept}, redirect: 'follow', signal: AbortSignal.timeout(20000)});
  return {response, text: response.ok ? await response.text() : ''};
}
const robots = new Map();
async function allowed(url) {
  const {origin, pathname, search} = new URL(url);
  if (!robots.has(origin)) robots.set(origin, get(`${origin}/robots.txt`, 'text/plain').then(r => r.text).catch(() => ''));
  return robotsAllow(await robots.get(origin), pathname + search);
}

// Store-page URLs in Chicago from a host's sitemaps (following sitemap indexes, Chicago/Illinois parts first).
const sitemapCache = new Map();
async function chicagoPages(host) {
  if (sitemapCache.has(host)) return sitemapCache.get(host);
  const task = (async () => {
    const robotsText = await get(`https://${host}/robots.txt`, 'text/plain').then(r => r.text).catch(() => '');
    const queue = [...robotsText.matchAll(/^sitemap:\s*(\S+)/gim)].map(m => new URL(m[1], `https://${host}`).href);
    if (!queue.length) queue.push(`https://${host}/sitemap.xml`);
    const seen = new Set(), pages = new Set();
    while (queue.length && seen.size < 40) {
      const url = queue.shift(); if (seen.has(url)) continue; seen.add(url);
      if (!(await allowed(url))) continue;
      const {text} = await get(url).catch(() => ({text: ''}));
      const locs = [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1].replaceAll('&amp;', '&'));
      if (/<sitemapindex/i.test(text)) {
        // Visit Illinois/Chicago/location sitemaps before others.
        const ranked = locs.sort((a, b) => (/chicago|\bil\b|illinois/i.test(b) - /chicago|\bil\b|illinois/i.test(a)) || (/locat|store|restaurant/i.test(b) - /locat|store|restaurant/i.test(a)));
        queue.push(...ranked);
      } else for (const loc of locs) if (/chicago/i.test(loc)) pages.add(loc);
      await sleep(400);
    }
    return [...pages];
  })();
  sitemapCache.set(host, task);
  return task;
}

// When store links carry an ID instead of the address, read each Chicago store page once (up to 250 per chain).
const pageCache = new Map();
async function chicagoStorePages(host) {
  if (pageCache.has(host)) return pageCache.get(host);
  const task = (async () => {
    const pages = (await chicagoPages(host).catch(() => [])).filter(u => !/\/(delivery|catering|menu|order|jobs?|careers?)\b/i.test(u)).slice(0, 250), read = [];
    for (const url of pages) {
      if (!(await allowed(url))) continue;
      const {text} = await get(url).catch(() => ({text: ''}));
      if (text) read.push({url, html: text, lower: text.toLowerCase()});
      await sleep(350);
    }
    return read;
  })();
  pageCache.set(host, task);
  return task;
}

const flat = value => Array.isArray(value) ? value.flatMap(flat) : value && typeof value === 'object' ? [value, ...flat(value['@graph'] || [])] : [];
const norm = s => String(s || '').toLowerCase().replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|north|south|east|west|n|s|e|w)\b\.?/g, '').replace(/[^a-z0-9]/g, '');
const streetWord = street => String(street || '').toLowerCase().replace(/\b(north|south|east|west|street|avenue|road|boulevard|drive|place|court|parkway)\b/g, '').trim().split(/\s+/)[0];
function pageHours(html, tags) {
  const nodes = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m => {try {return flat(JSON.parse(m[1].trim()));} catch {return [];}});
  for (const node of nodes) {
    const a = node.address || node.location?.address;
    if (!a || typeof a !== 'object' || !(node.openingHoursSpecification || node.openingHours)) continue;
    const street = norm(a.streetAddress);
    if (!(street.startsWith(norm(tags['addr:housenumber'])) && street.includes(norm(tags['addr:street'])))) continue;
    const schedule = parseOpeningSpecification(node.openingHoursSpecification) || parseOpeningHours((Array.isArray(node.openingHours) ? node.openingHours : [node.openingHours]).filter(Boolean).join('; '));
    if (schedule) return {schedule, method: 'schema.org data'};
  }
  const schedule = findHoursInPage(html, {housenumber: tags['addr:housenumber'], street: tags['addr:street'], requireAddress: true});
  return schedule ? {schedule, method: 'hours next to the store address'} : null;
}

// Locator hosts per brand, from the branch websites OpenStreetMap lists for that brand anywhere in the snapshot.
const hostsByBrand = new Map();
for (const e of raw.elements) {
  const t = e.tags || {}, url = t.website || t['contact:website'];
  if (!t.brand || !url) continue;
  try {const host = new URL(url).host; const m = hostsByBrand.get(t.brand) || new Map(); m.set(host, (m.get(host) || 0) + 1); hostsByBrand.set(t.brand, m);} catch {}
}
// Brands whose OSM branches list no store pages here, mapped to their public locators.
const KNOWN = {'Subway': 'restaurants.subway.com', 'Potbelly': 'www.potbelly.com', 'Great Clips': 'www.greatclips.com', 'Baskin-Robbins': 'locations.baskinrobbins.com', "Jersey Mike's Subs": 'www.jerseymikes.com', 'Five Guys': 'restaurants.fiveguys.com', "Jimmy John's": 'locations.jimmyjohns.com', 'Chipotle': 'locations.chipotle.com', "Dunkin'": 'locations.dunkindonuts.com', "Raising Cane's": 'locations.raisingcanes.com', 'Smoothie King': 'locations.smoothieking.com'};

const todo = places.filter(p => {
  const t = tagsById.get(p.id) || {};
  return t.brand && t['addr:housenumber'] && t['addr:street'] && !p.schedule && !venues[p.id]?.website?.hours;
});
const results = {}, log = {};
for (const p of todo) {
  const t = tagsById.get(p.id), hosts = [...(hostsByBrand.get(t.brand) || new Map())].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  if (KNOWN[t.brand] && !hosts.includes(KNOWN[t.brand])) hosts.push(KNOWN[t.brand]);
  log[p.id] = {brand: t.brand, address: `${t['addr:housenumber']} ${t['addr:street']}`, hosts};
  for (const host of hosts.slice(0, 2)) {
    const pages = await chicagoPages(host).catch(() => []), word = streetWord(t['addr:street']);
    // The store's own page, not its delivery, catering or product pages; shortest link first.
    const matches = pages.filter(u => {const slug = decodeURIComponent(u).toLowerCase(); return !/\/(delivery|catering|menu|order|jobs?|careers?|[a-z-]*wings?|[a-z-]*pizza)\/?$/.test(slug) && new RegExp(`(^|[^0-9])${t['addr:housenumber']}([^0-9]|$)`).test(slug) && slug.includes(word);}).sort((a, b) => a.length - b.length);
    log[p.id].candidates = matches.slice(0, 3);
    for (const url of matches.slice(0, 3)) {
      if (!(await allowed(url))) continue;
      const {text} = await get(url).catch(() => ({text: ''}));
      const hours = text && pageHours(text, t);
      if (hours) {results[p.id] = {schedule: hours.schedule, source: `${hours.method} on the ${t.brand} store page`, page: url}; break;}
      await sleep(400);
    }
    if (results[p.id]) break;
    if (!matches.length) {
      const address = new RegExp(`\\b${t['addr:housenumber']}\\b[^<]{0,40}\\b${word}`);
      for (const page of (await chicagoStorePages(host)).filter(page => address.test(page.lower)).slice(0, 3)) {
        const hours = pageHours(page.html, t);
        if (hours) {results[p.id] = {schedule: hours.schedule, source: `${hours.method} on the ${t.brand} store page`, page: page.url}; log[p.id].candidates = [page.url]; break;}
      }
      if (results[p.id]) break;
    }
  }
  log[p.id].found = !!results[p.id];
}
writeFileSync(out, JSON.stringify({checked: new Date().toISOString().slice(0, 10), agent: AGENT, note: 'Chain branch hours from store pages found in each chain’s sitemap by street address; the page’s own address must match.', places: results, log}, null, 1));
console.log('Chain branches checked:', todo.length, 'hours found:', Object.keys(results).length);
for (const [id, r] of Object.entries(results)) console.log(' ', places.find(p => p.id === id).name, '·', log[id].address, '←', r.page);
