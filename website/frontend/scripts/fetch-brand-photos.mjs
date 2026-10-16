// One photo per chain: the brand's Wikidata image (P18) on Wikimedia Commons, else the share image on the
// brand's official website. These are brand photos, not photos of the branch on the map: import-nearby-places.mjs labels them "not this branch"
// and uses them only when the branch has no photo of its own. Writes data/places/brand-photos.json.
// Run from website/frontend: node scripts/fetch-brand-photos.mjs
import {readFileSync, writeFileSync, existsSync} from 'node:fs';

const AGENT = 'KampuscapeBot/1.0 (https://kampuscape.com/support; student project) node-fetch';
const out = new URL('../../data/places/brand-photos.json', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('../../data/places/uic-nearby-osm.json', import.meta.url)));
const places = JSON.parse(readFileSync(new URL('../src/nearbyPlaces.json', import.meta.url))).places;
const tagsById = new Map(raw.elements.map(e => [`osm-${e.type}-${e.id}`, e.tags || {}]));
const previous = existsSync(out) ? Object.fromEntries(Object.entries(JSON.parse(readFileSync(out)).brands).filter(([, v]) => v.src)) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function json(url, attempt = 0) {
  const r = await fetch(url, {headers: {'User-Agent': AGENT, Accept: 'application/json'}, signal: AbortSignal.timeout(30000)});
  if ((r.status === 429 || r.status >= 500) && attempt < 4) {await sleep(5000 * (attempt + 1)); return json(url, attempt + 1);}
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
const text = html => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const brands = new Map();
for (const p of places) {
  const t = tagsById.get(p.id) || {};
  if (t['brand:wikidata'] && t.brand) brands.set(t['brand:wikidata'], t.brand);
}
const review = JSON.parse(readFileSync(new URL('../../data/places/photo-review.json', import.meta.url))), rejected = review.rejectedBrands || {}, picks = review.brandPicks || {};
// Without a usable Commons photo, the brand's own website (Wikidata P856) offers its share image (og:image).
async function websitePhoto(entity, brand) {
  if (rejected[entity?.id]?.website) return {brand, missing: 'website image rejected on review'};
  const site = entity?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
  if (!site) return {brand, missing: 'no Commons photo or official website'};
  try {
    const r = await fetch(site, {headers: {'User-Agent': 'Mozilla/5.0 (compatible; KampuscapeBot/1.0; +https://kampuscape.com/support)'}, redirect: 'follow', signal: AbortSignal.timeout(20000)});
    const html = r.ok ? await r.text() : '';
    const og = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    if (!og) return {brand, missing: 'official website has no share image', site};
    return {brand, website: true, src: new URL(og[1].replaceAll('&amp;', '&'), r.url).href, page: r.url};
  } catch (error) {return {brand, missing: `website: ${error.message || error}`, site};}
}
const results = {};
for (const [qid, brand] of brands) {
  if (previous[qid] && !rejected[qid] && (!picks[qid] || previous[qid].file === picks[qid].file)) {results[qid] = previous[qid]; continue;}
  try {
    const entity = (await json(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).entities[qid];
    // A Commons file picked by hand comes first; a rejected Wikidata image is skipped.
    const file = picks[qid]?.file || (rejected[qid] ? null : entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value);
    await sleep(1200);
    if (!file) {results[qid] = await websitePhoto(entity, brand); continue;}
    const info = await json(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${file}`)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200&format=json`);
    const image = Object.values(info.query.pages)[0].imageinfo?.[0], meta = image?.extmetadata || {};
    await sleep(1200);
    if (!image || !/jpeg|png|webp/.test(image.mime) || image.width < 500) {results[qid] = await websitePhoto(entity, brand); continue;}
    results[qid] = {brand, file, src: image.thumburl || image.url, page: image.descriptionurl, author: text(meta.Artist?.value) || 'Unknown author', license: meta.LicenseShortName?.value || 'see file page'};
  } catch (error) {results[qid] = {brand, missing: String(error.message || error)};}
}
writeFileSync(out, JSON.stringify({checked: new Date().toISOString().slice(0, 10), agent: AGENT, note: 'Brand photos from Wikidata (P18) on Wikimedia Commons, else the brand website share image. Shown only on branches without their own photo, labeled as a brand photo, not this branch. Reject a photo in photo-review.json → rejectedBrands.', brands: results}, null, 1) + '\n');
console.log('Brands:', brands.size, 'with photo:', Object.values(results).filter(r => r.src).length);
