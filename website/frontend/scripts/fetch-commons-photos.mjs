// Freely licensed photos of nearby places from Wikidata and Wikimedia Commons. A photo counts only when
// it is near the place (Wikidata item ≤100 m, Commons file ≤60 m) and its title names the place, so
// street scenes and neighbours are not mistaken for the venue. Writes data/places/commons-photos.json;
// import-nearby-places.mjs merges it. Run from website/frontend: node scripts/fetch-commons-photos.mjs
import {readFileSync, writeFileSync} from 'node:fs';

const AGENT = 'KampuscapeBot/1.0 (https://kampuscape.com/support; student project) node-fetch';
const out = new URL('../../data/places/commons-photos.json', import.meta.url);
const places = JSON.parse(readFileSync(new URL('../src/nearbyPlaces.json', import.meta.url))).places.filter(p => p.id.startsWith('osm-'));
const raw = JSON.parse(readFileSync(new URL('../../data/places/uic-nearby-osm.json', import.meta.url)));
const tagsById = new Map(raw.elements.map(e => [`osm-${e.type}-${e.id}`, e.tags || {}]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
const cacheFile = `${tmpdir()}/kampuscape-commons-cache.json`, cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
process.on('exit', () => writeFileSync(cacheFile, JSON.stringify(cache)));
async function json(url, attempt = 0) {
  if (cache[url]) return cache[url];
  const value = await fetchJson(url, attempt); cache[url] = value; return value;
}
async function fetchJson(url, attempt = 0) {
  const response = await fetch(url, {headers: {'User-Agent': AGENT, Accept: 'application/json'}, signal: AbortSignal.timeout(30000)});
  if (response.status === 429 && attempt < 4) {await sleep(5000 * (attempt + 1)); return fetchJson(url, attempt + 1);}
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

// Words that describe a kind of place rather than this place.
const GENERIC = new Set('the and of at on in by restaurant restaurants cafe caffe coffee tea chicago grill grille pizza pizzeria kitchen market bar tavern pub lounge bakery house shop store food foods express street west east north south loop company co inc llc salon barber barbershop beauty spa nails taqueria deli italian mexican chinese thai greek japanese korean indian vietnamese american mediterranean sushi ramen noodle noodles bbq burger burgers tacos taco beef cuisine bistro diner club bowl bowls juice smoothie donuts donut ice cream gelato wine beer brewing brewery liquor liquors grocery groceries foods mart supermarket convenience pharmacy library branch center centre university uic little italy greektown pilsen chinatown village square'.split(' '));
const words = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
// Street and place names: a title sharing only these with a venue is about the street or area, not the venue.
const GEO = new Set('halsted taylor wacker clark state madison canal wells adams jackson monroe randolph lake roosevelt racine ashland ogden harrison polk morgan damen western van buren blue island grand washington dearborn franklin jefferson desplaines clinton green peoria sangamon aberdeen carpenter throop loomis laflin paulina wood hermitage wolcott marshfield congress 18th cermak maxwell river city branch haymarket one two three south north east west near side chicago illinois il usa us'.split(' '));
const KIND = /\b(bar|pub|tavern|lounge|cafe|caf|coffee|restaurant|grill|diner|deli|bakery|store|shop|market|salon|barber|station|kitchen|pizza|pizzeria|taqueria|brewery|library|bookstore)\b/;
const PEOPLE = /\b(wikimedians?|meetup|meet up|user group|edit-?a-?thon|people|portrait|selfie|crowd|protest|riot|parade|wedding|festival|march|rally|site of|memorial|plaque|marker)\b/;
function namesPlace(title, name) {
  const t = ` ${words(title).join(' ')} `, all = words(name), distinctive = all.filter(w => w.length >= 3 && !GENERIC.has(w) && !GEO.has(w));
  if (PEOPLE.test(t)) return false;
  const whole = t.includes(` ${all.join(' ')} `);
  if (!(whole || (distinctive.length >= 2 && distinctive.every(w => t.includes(` ${w} `))))) return false;
  // A name made only of common and place words ("South Branch") must also say what kind of place it is.
  return distinctive.length ? true : KIND.test(t);
}
const metres = (a, b) => {const r = Math.PI / 180, x = (b[1] - a[1]) * r, y = (b[0] - a[0]) * r * Math.cos((a[1] + b[1]) / 2 * r); return 6371000 * Math.hypot(x, y);};
const strip = html => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function fileInfo(title) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=960&titles=${encodeURIComponent(title.startsWith('File:') ? title : `File:${title}`)}`;
  const page = Object.values((await json(api)).query?.pages || {})[0], info = page?.imageinfo?.[0];
  if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime) || info.width < 480 || info.height < 270) return null;
  const meta = info.extmetadata || {}, license = strip(meta.LicenseShortName?.value);
  if (!license || /fair use|non-free/i.test(license)) return null;
  return {src: info.thumburl || info.url, page: info.descriptionurl, credit: [strip(meta.Artist?.value), license].filter(Boolean).join(' · '), width: info.width, height: info.height};
}

// 1. Wikidata items around both student centers, matched to places by distance and name.
const sparql = center => `SELECT ?item ?label ?coord ?image WHERE { SERVICE wikibase:around { ?item wdt:P625 ?coord . bd:serviceParam wikibase:center "Point(${center[0]} ${center[1]})"^^geo:wktLiteral . bd:serviceParam wikibase:radius "1.75" . } ?item wdt:P18 ?image . ?item rdfs:label ?label . FILTER(LANG(?label) = "en") }`;
const items = [];
for (const center of [[-87.647964, 41.871967], [-87.674561, 41.870762]]) {
  const data = await json(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql(center))}`);
  for (const b of data.results.bindings) {
    const [lng, lat] = b.coord.value.replace(/^Point\(|\)$/g, '').split(' ').map(Number);
    items.push({id: b.item.value.split('/').pop(), label: b.label.value, coords: [lng, lat], file: decodeURIComponent(b.image.value.split('/').pop())});
  }
  await sleep(1500);
}
const results = {};
// Commons files approved by hand in photo-review.json (seen and confirmed, but not geotagged).
const review = JSON.parse(readFileSync(new URL('../../data/places/photo-review.json', import.meta.url)));
for (const [id, {file}] of Object.entries(review.approved || {})) {
  const photo = await fileInfo(file).catch(() => null);
  if (photo && places.some(p => p.id === id)) results[id] = {...photo, via: 'Reviewed by hand'};
}
for (const p of places) {
  const tags = tagsById.get(p.id) || {};
  const item = items.find(i => i.id === tags.wikidata) || items.find(i => metres(i.coords, p.coords) <= 100 && namesPlace(i.label, p.name));
  if (!item) continue;
  const photo = await fileInfo(item.file).catch(() => null);
  if (photo) results[p.id] = {...photo, via: `Wikidata ${item.id}`};
  await sleep(300);
}
console.log('Wikidata matches:', Object.keys(results).length, 'from', items.length, 'items');

// 2. Commons files geotagged at the place whose title names it.
let checked = 0;
for (const p of places) {
  if (results[p.id]) continue;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=geosearch&gsnamespace=6&gslimit=100&gsradius=60&gscoord=${p.coords[1]}|${p.coords[0]}`, cached = !!cache[url];
  const near = await json(url).catch(() => null);
  for (const hit of near?.query?.geosearch || []) {
    if (!namesPlace(hit.title.replace(/^File:|\.\w+$/g, ''), p.name)) continue;
    const photo = await fileInfo(hit.title).catch(() => null);
    if (photo) {results[p.id] = {...photo, via: 'Commons geotag'}; break;}
  }
  if (++checked % 100 === 0) console.log(checked, 'checked');
  if (!cached) await sleep(250);
}
// 3. Commons files found by searching the place's name: the file must be geotagged within 250 m of the place.
// (A title that merely mentions Chicago matched paintings and storms named like venues, so it doesn't count.)
const brands = new Set(raw.elements.filter(e => e.tags?.['brand:wikidata']).map(e => `osm-${e.type}-${e.id}`));
for (const p of places) {
  if (results[p.id] || brands.has(p.id) || words(p.name).filter(w => !GENERIC.has(w) && !GEO.has(w)).join('').length < 4) continue;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=15&srsearch=${encodeURIComponent(`"${p.name}" Chicago`)}`, cached = !!cache[url];
  const hits = (await json(url).catch(() => null))?.query?.search || [];
  for (const hit of hits) {
    const title = hit.title.replace(/^File:|\.\w+$/g, '');
    if (!namesPlace(title, p.name)) continue;
    const coords = Object.values((await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=coordinates&titles=${encodeURIComponent(hit.title)}`).catch(() => ({query: {pages: {}}}))).query.pages)[0]?.coordinates?.[0];
    const near = !!coords && metres([coords.lon, coords.lat], p.coords) <= 250 && !/\bnear\b/i.test(title);
    if (!near) continue;
    const photo = await fileInfo(hit.title).catch(() => null);
    if (photo) {results[p.id] = {...photo, via: 'Commons search'}; break;}
  }
  if (!cached) await sleep(300);
}

writeFileSync(out, JSON.stringify({checked: new Date().toISOString().slice(0, 10), note: 'Freely licensed photos matched to places by location and name; credit and license from Commons.', places: results}, null, 1));
console.log('Photos found:', Object.keys(results).length, Object.entries(results).map(([id, r]) => `${places.find(p => p.id === id).name} ← ${r.page.split('File:')[1]}`).join('\n'));
