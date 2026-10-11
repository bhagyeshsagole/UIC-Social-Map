// Reads each nearby place's own website (from OpenStreetMap) and Wikidata/Commons for published hours and
// a representative photo. Writes a dated snapshot; import-nearby-places.mjs merges it. Never invents data:
// hours count only when the page's schema.org address matches the place, and images must look like photos.
// Run from website/frontend: node scripts/fetch-venue-websites.mjs
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseOpeningHours, parseOpeningSpecification} from '../src/openingHours.js';

const AGENT = 'Mozilla/5.0 (compatible; KampuscapeBot/1.0; +https://kampuscape.com/support)';
const CHECKED = new Date().toISOString().slice(0, 10);
const out = new URL('../../data/places/venue-websites.json', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('../../data/places/uic-nearby-osm.json', import.meta.url)));
const places = JSON.parse(readFileSync(new URL('../src/nearbyPlaces.json', import.meta.url))).places;
const tagsById = new Map(raw.elements.map(e => [`osm-${e.type}-${e.id}`, e.tags || {}]));
const websiteOf = p => (p.sources || []).find(([label]) => label === 'Venue website')?.[1];

// A website shared by several listings is a chain or group site, not this branch.
const shared = new Map();
for (const p of places) {const url = websiteOf(p); if (url) {const key = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase(); shared.set(key, (shared.get(key) || 0) + 1);}}
const isShared = url => shared.get(url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase()) > 1;

async function get(url, {limit = 3_000_000, accept = 'text/html,application/xhtml+xml'} = {}) {
  const response = await fetch(url, {headers: {'User-Agent': AGENT, Accept: accept}, redirect: 'follow', signal: AbortSignal.timeout(15000)});
  const reader = response.body?.getReader(), chunks = []; let size = 0;
  while (reader) {const {done, value} = await reader.read(); if (done) break; size += value.length; if (size > limit) {await reader.cancel(); break;} chunks.push(value);}
  return {response, bytes: Buffer.concat(chunks)};
}

const robots = new Map();
async function allowed(url) {
  const {origin, pathname} = new URL(url);
  if (!robots.has(origin)) robots.set(origin, get(`${origin}/robots.txt`, {accept: 'text/plain'}).then(({response, bytes}) => response.ok ? bytes.toString('utf8') : '').catch(() => ''));
  let applies = false, rules = [];
  for (const line of (await robots.get(origin)).split(/\r?\n/)) {
    const [key, ...rest] = line.split(':'), value = rest.join(':').trim(), field = key.trim().toLowerCase();
    if (field === 'user-agent') applies = value === '*' || /kampuscape/i.test(value);
    else if (applies && field === 'disallow' && value) rules.push(value);
  }
  return !rules.some(rule => pathname.startsWith(rule.replace(/\*.*$/, '')));
}

// Width and height from the first bytes of a JPEG, PNG or WebP file.
function dimensions(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (kind === 'VP8L') {const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1];}
    if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) {i++; continue;}
      const marker = b[i + 1], length = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + length;
    }
  }
  return null;
}

// Colour variety of a 24×24 thumbnail, made with macOS sips. Without sips, images are skipped.
function palette(bytes) {
  const dir = mkdtempSync(join(tmpdir(), 'kampuscape-photo-'));
  try {
    writeFileSync(join(dir, 'in'), bytes);
    execFileSync('sips', ['-s', 'format', 'bmp', '-z', '24', '24', join(dir, 'in'), '--out', join(dir, 'out.bmp')], {stdio: 'ignore'});
    const b = readFileSync(join(dir, 'out.bmp')), offset = b.readUInt32LE(10), width = b.readInt32LE(18), height = Math.abs(b.readInt32LE(22)), step = b.readUInt16LE(28) / 8, row = (width * step + 3) & ~3, counts = new Map();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {const i = offset + y * row + x * step, key = (b[i + 2] >> 4) << 8 | (b[i + 1] >> 4) << 4 | b[i] >> 4; counts.set(key, (counts.get(key) || 0) + 1);}
    return {distinct: counts.size, dominant: Math.max(...counts.values()) / (width * height)};
  } catch {return null;} finally {rmSync(dir, {recursive: true, force: true});}
}

async function photoCheck(src) {
  if (!/^https:\/\//.test(src) || /logo|icon|favicon|sprite|placeholder|avatar|badge|\.svg|\.gif/i.test(src)) return null;
  const {response, bytes} = await get(src, {limit: 8_000_000, accept: 'image/jpeg,image/png,image/webp'});
  if (!response.ok || !/^image\/(jpeg|webp)/.test(response.headers.get('content-type') || '')) return null;
  const size = dimensions(bytes);
  if (!size) return null;
  const [width, height] = size, ratio = width / height;
  // Logos, banners and drawings compress small and use few flat colours; photos don't.
  if (width < 480 || height < 270 || ratio < 0.9 || ratio > 2.6 || bytes.length / (width * height) < 0.06) return null;
  const colours = palette(bytes);
  return colours && colours.distinct >= 80 && colours.dominant <= 0.35 ? {width, height} : null;
}

const flat = value => Array.isArray(value) ? value.flatMap(flat) : value && typeof value === 'object' ? [value, ...flat(value['@graph'] || [])] : [];
const norm = s => String(s || '').toLowerCase().replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|north|south|east|west|n|s|e|w)\b\.?/g, '').replace(/[^a-z0-9]/g, '');
function sameAddress(node, tags) {
  const a = node.address || node.location?.address; if (!a || typeof a !== 'object') return false;
  const street = norm(a.streetAddress), number = tags['addr:housenumber'], name = norm(tags['addr:street']);
  if (number && name && street.startsWith(norm(number)) && street.includes(name)) return true;
  return false;
}

function readPage(html, tags) {
  const nodes = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m => {try {return flat(JSON.parse(m[1].trim()));} catch {return [];}});
  let hours = null;
  for (const node of nodes) {
    if (!(node.openingHoursSpecification || node.openingHours) || !sameAddress(node, tags)) continue;
    hours = parseOpeningSpecification(node.openingHoursSpecification) || parseOpeningHours((Array.isArray(node.openingHours) ? node.openingHours : [node.openingHours]).filter(Boolean).join('; '));
    if (hours) break;
  }
  const meta = name => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)`, 'i'))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'))?.[1];
  const image = meta('og:image:secure_url') || meta('og:image') || meta('twitter:image');
  return {hours, image: image?.replaceAll('&amp;', '&')};
}

const GENERIC = new Set(['the','and','restaurant','cafe','coffee','chicago','grill','pizza','pizzeria','kitchen','market','bar','tavern','bakery','house','shop','food','foods','express','street','west','east','loop','company','store','salon','barber','beauty','pub','lounge','taqueria','deli']);
const words = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
function namesVenue(html, name) {
  const head = [html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1], ...[...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:title|og:site_name|application-name)["'][^>]*content=["']([^"']+)/gi)].map(m => m[1])].join(' ');
  const text = words(head).join(' '), distinctive = words(name).filter(w => w.length >= 4 && !GENERIC.has(w));
  return distinctive.length ? distinctive.some(w => text.includes(w)) : text.includes(words(name).join(' '));
}

async function website(place, tags) {
  const url = websiteOf(place);
  if (!url || !(await allowed(url))) return null;
  const {response, bytes} = await get(url);
  if (!response.ok || !/html/.test(response.headers.get('content-type') || '')) return null;
  // Expired domains get taken over by spam, so the page must name the venue before anything is used.
  const html = bytes.toString('utf8');
  if (!namesVenue(html, place.name)) return null;
  const page = response.url, {hours, image} = readPage(html, tags), result = {url, page};
  if (hours) result.hours = {schedule: hours, source: 'schema.org opening hours on the venue website'};
  if (image && !isShared(url) && !tags['brand:wikidata']) {
    const src = new URL(image, page).href, size = await photoCheck(src).catch(() => null);
    if (size) result.image = {src, ...size};
  }
  return result.hours || result.image ? result : null;
}

const strip = html => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
async function commons(tags) {
  const id = tags.wikidata; if (!/^Q\d+$/.test(id || '')) return null;
  const {bytes} = await get(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, {accept: 'application/json'});
  const file = JSON.parse(bytes).entities?.[id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value; if (!file) return null;
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&titles=${encodeURIComponent(`File:${file}`)}`;
  const info = Object.values(JSON.parse((await get(api, {accept: 'application/json'})).bytes).query.pages)[0]?.imageinfo?.[0]; if (!info) return null;
  const meta = info.extmetadata || {};
  return {src: info.thumburl || info.url, page: info.descriptionurl, credit: [strip(meta.Artist?.value), strip(meta.LicenseShortName?.value)].filter(Boolean).join(' · ') || 'Wikimedia Commons'};
}

const results = {}; let done = 0;
const queue = places.filter(p => p.id.startsWith('osm-') && (websiteOf(p) || tagsById.get(p.id)?.wikidata));
async function worker() {
  for (let place; (place = queue.shift());) {
    const tags = tagsById.get(place.id) || {}, entry = {};
    try {const site = await website(place, tags); if (site) entry.website = site;} catch {}
    try {const photo = await commons(tags); if (photo) entry.commons = photo;} catch {}
    if (Object.keys(entry).length) results[place.id] = entry;
    if (++done % 100 === 0) console.log(done, 'checked');
  }
}
await Promise.all(Array.from({length: 16}, worker));
writeFileSync(out, JSON.stringify({checked: CHECKED, agent: AGENT, note: 'Hours only from schema.org data whose address matches the place; images from the venue page or Wikimedia Commons.', places: results}, null, 1));
const values = Object.values(results);
console.log({checked: done, hours: values.filter(v => v.website?.hours).length, websiteImages: values.filter(v => v.website?.image).length, commons: values.filter(v => v.commons).length});
