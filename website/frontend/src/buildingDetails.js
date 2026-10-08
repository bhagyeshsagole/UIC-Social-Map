// Only look up the roof the user selected, never a nearest street/neighboring venue.
const text = value => typeof value === 'string' ? value.trim() : '';
export function buildingLabel(tags = {}) {
  const street = text(tags['addr:street']);
  const address = text(tags['addr:full']) || (street && text(tags['addr:housenumber'])
    ? `${text(tags['addr:housenumber'])} ${street}` : '');
  return {name: text(tags['name:en']) || text(tags.name) || address, address};
}
function inRing([x,y], ring) {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [ax,ay]=ring[i], [bx,by]=ring[j];
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
  }
  return inside;
}
function contains(point, geometry) {
  const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygons.some(([outer,...holes]) => inRing(point,outer) && !holes.some(hole=>inRing(point,hole)));
}
export function detailsFromElements(venue, elements = []) {
  const buildings = elements.filter(e=>e.type==='way' && (e.tags?.building || e.tags?.['building:part']) && e.geometry?.length>=4)
    .map(e=>({...e,polygon:{type:'Polygon',coordinates:[e.geometry.map(p=>[p.lon,p.lat])]}}))
    .filter(e=>contains(venue.coords,e.polygon));
  // Do not choose between multiple named tenants. Prefer the building's own tags.
  const labels = buildings.map(e=>buildingLabel(e.tags));
  const named = labels.filter(label=>label.name && label.name!==label.address);
  if (new Set(named.map(label=>label.name)).size===1) return named[0];
  const addresses = labels.filter(label=>label.address);
  if (new Set(addresses.map(label=>label.address)).size===1) return {name:addresses[0].address,address:addresses[0].address};
  const nodes = elements.filter(e=>e.type==='node' && contains([e.lon,e.lat],venue.footprint)).map(e=>buildingLabel(e.tags));
  const nodeAddresses = [...new Set(nodes.map(label=>label.address).filter(Boolean))];
  if (nodeAddresses.length===1) return {name:nodeAddresses[0],address:nodeAddresses[0]};
  const nodeNames = [...new Set(nodes.map(label=>label.name).filter(Boolean))];
  return nodeNames.length===1 ? {name:nodeNames[0],address:''} : null;
}
// Nominatim reverse geocoding answers in under a second. Use the exact tapped
// point: accept a building outline covering it, or a single shop/amenity point
// within ~15 m of the tap and inside the roof. Never a street, park or campus area.
const metres = ([x1,y1],[x2,y2]) => Math.hypot((x1-x2)*111320*Math.cos(y1*Math.PI/180),(y1-y2)*110540);
function distanceTo(point, geometry) {
  const rings = geometry?.type === 'Polygon' ? geometry.coordinates : geometry?.type === 'MultiPolygon' ? geometry.coordinates.flat() : [];
  let best = Infinity;
  const k = 111320*Math.cos(point[1]*Math.PI/180), m = 110540;
  for (const ring of rings) for (let i=1;i<ring.length;i++) {
    const [ax,ay]=ring[i-1], [bx,by]=ring[i];
    const dx=(bx-ax)*k, dy=(by-ay)*m, px=(point[0]-ax)*k, py=(point[1]-ay)*m;
    const t=Math.max(0,Math.min(1,(px*dx+py*dy)/((dx*dx+dy*dy)||1)));
    best=Math.min(best,Math.hypot(px-t*dx,py-t*dy));
  }
  return best;
}
export function detailsFromReverse(venue, result) {
  if (!result || result.error) return null;
  const tap = venue.tap || venue.coords, shape = result.geojson;
  const a = result.address || {};
  const address = text(a.house_number) && text(a.road) ? `${text(a.house_number)} ${text(a.road)}` : '';
  const name = text(result.name);
  // In 3D a roof tap lands on the ground behind the building, so allow a building
  // within ~15 m of the tap when its centre is inside the roof the map hit-tested.
  const centre = [Number(result.lon), Number(result.lat)];
  const covers = shape?.type === 'Point'
    ? metres(shape.coordinates, tap) <= 15 && contains(shape.coordinates, venue.footprint)
    : result.category === 'building' && (contains(tap, shape) || (contains(centre, venue.footprint) && distanceTo(tap, shape) <= 15));
  if (!covers || !(name || address)) return null;
  return {name:name || address, address};
}
const cache = new Map();
let nextRequestAt = 0, overpassPausedUntil = 0;
const wait = (ms, signal) => new Promise((resolve,reject)=>{
  const cancel=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},ms);
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
});
// One request per second across both services (Nominatim and Overpass usage policies).
async function polite(signal) {
  const delay = Math.max(150,nextRequestAt-Date.now());
  nextRequestAt=Date.now()+delay+1000;
  await wait(delay, signal);
}
async function reverseLookup(venue, {signal, fetcher, reverseEndpoint}) {
  const [lon,lat] = venue.tap || venue.coords;
  const url = `${reverseEndpoint}?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&polygon_geojson=1&polygon_threshold=0.00001`;
  const response = await fetcher(url, {signal, headers:{Accept:'application/json'}});
  if (!response.ok) throw new Error('Reverse lookup unavailable');
  const result = await response.json();
  // An answered "nothing here" is final; only an unreachable service falls back.
  return {answered:!result.error, details:detailsFromReverse(venue, result)};
}
async function overpassLookup(venue, {signal, fetcher, endpoint}) {
  if (Date.now() < overpassPausedUntil) throw new Error('Building lookup paused');
  const points=venue.footprint.type==='Polygon'?venue.footprint.coordinates.flat():venue.footprint.coordinates.flat(2);
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const box=[Math.min(...ys)-.00001,Math.min(...xs)-.00001,Math.max(...ys)+.00001,Math.max(...xs)+.00001].join(',');
  const query=`[out:json][timeout:4];(way[building](${box});way["building:part"](${box});node["addr:housenumber"](${box});node[name](${box}););out tags geom;`;
  // Public Overpass is often overloaded; give it 4 s, never the whole wait.
  const own = new AbortController(), timer = setTimeout(()=>own.abort(), 4000);
  const relay = () => own.abort(); signal?.addEventListener('abort', relay, {once:true});
  try {
    const response=await fetcher(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:own.signal});
    if(!response.ok){if(response.status===429||response.status===406)overpassPausedUntil=Date.now()+30000;throw new Error('Building lookup unavailable');}
    const data=await response.json();
    if(!Array.isArray(data.elements)||data.remark)throw new Error('Incomplete building lookup');
    return detailsFromElements(venue,data.elements);
  } finally {clearTimeout(timer); signal?.removeEventListener('abort', relay);}
}
export async function lookupBuilding(venue, {signal, fetcher=fetch, endpoint='https://overpass-api.de/api/interpreter', reverseEndpoint='https://nominatim.openstreetmap.org/reverse'} = {}) {
  if (cache.has(venue.id)) return cache.get(venue.id);
  // Debounce quick repins; cancellations never overwrite a later pin.
  await polite(signal);
  const reverse = await reverseLookup(venue, {signal, fetcher, reverseEndpoint}).catch(e => {if (e?.name === 'AbortError') throw e; return null;});
  let details = reverse?.details || null;
  if (!reverse?.answered) {
    await polite(signal);
    details = await overpassLookup(venue, {signal, fetcher, endpoint});
  }
  cache.set(venue.id,details);
  if(cache.size>100)cache.delete(cache.keys().next().value);
  return details;
}
