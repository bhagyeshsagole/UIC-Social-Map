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
const cache = new Map();
let nextRequestAt = 0;
export async function lookupBuilding(venue, {signal, fetcher=fetch, endpoint='https://overpass-api.de/api/interpreter'} = {}) {
  if (cache.has(venue.id)) return cache.get(venue.id);
  // Debounce quick repins and space requests; cancellations never overwrite a later pin.
  const delay = Math.max(500,nextRequestAt-Date.now());
  nextRequestAt=Date.now()+delay+1100;
  await new Promise((resolve,reject)=>{
    const cancel=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},delay);
    if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  });
  const points=venue.footprint.type==='Polygon'?venue.footprint.coordinates.flat():venue.footprint.coordinates.flat(2);
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const box=[Math.min(...ys)-.00001,Math.min(...xs)-.00001,Math.max(...ys)+.00001,Math.max(...xs)+.00001].join(',');
  const query=`[out:json][timeout:8];(way[building](${box});way["building:part"](${box});node["addr:housenumber"](${box});node[name](${box}););out tags geom;`;
  const response=await fetcher(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal});
  if(!response.ok){if(response.status===429||response.status===406)nextRequestAt=Date.now()+30000;throw new Error('Building lookup unavailable');}
  const data=await response.json();
  if(!Array.isArray(data.elements)||data.remark)throw new Error('Incomplete building lookup');
  const details=detailsFromElements(venue,data.elements);
  cache.set(venue.id,details);
  if(cache.size>100)cache.delete(cache.keys().next().value);
  return details;
}
