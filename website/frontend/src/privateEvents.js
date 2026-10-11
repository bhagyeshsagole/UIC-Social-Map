// Legacy/external hash links contain snapshots; new owned-event links use eventShares.js.
// Only explicitly allowed fields are read back from links and local storage.
const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const coords = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 85;
export function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
}
export function cleanVenue(value) {
  if (!value || !coords(value.coords) || !text(value.id, 100) || !text(value.name, 120)) return null;
  const venue = {id:text(value.id, 100), name:text(value.name, 120), coords:[...value.coords], address:text(value.address, 180), kind:value.kind === 'outdoor' ? 'outdoor' : 'building'};
  if (value.footprint) {
    const g = value.footprint;
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : null;
    let count = 0;
    if (!Array.isArray(polygons) || !polygons.length || !polygons.every(p => Array.isArray(p) && p.length && p.every(r => Array.isArray(r) && r.length >= 4 && r.every(c => { count++; return coords(c) && Math.abs(c[0] - venue.coords[0]) < .02 && Math.abs(c[1] - venue.coords[1]) < .02; }) && r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1])) || count > 600) return null;
    venue.footprint = {type:g.type, coordinates:structuredClone(g.coordinates)};
    if (Number.isSafeInteger(value.featureId) && value.featureId >= 0) venue.featureId = value.featureId;
  }
  return venue;
}
export function cleanEvent(value) {
  if (!value || !text(value.title, 100) || !text(value.id, 160)) return null;
  const venue = cleanVenue(value.venue);
  const isPrivate = value.source === 'Private event';
  if (isPrivate && (!venue || !validDate(value.date) || !/^\d{2}:\d{2}$/.test(value.time) || Number(value.time.slice(0,2)) > 23 || Number(value.time.slice(3)) > 59)) return null;
  return {id:text(value.id, 160), title:text(value.title, 100), source:isPrivate ? 'Private event' : 'Shared event', venue,
    date:isPrivate ? value.date : undefined, time:isPrivate ? value.time : undefined,
    // Member events marked Public are listed for all UIC members; others stay link-only.
    visibility:isPrivate && value.visibility === 'public' ? 'public' : undefined,
    description:text(value.description, 500), when:text(value.when, 180), url:safeUrl(value.url),
    host:value.host && text(value.host.name,60)?{name:text(value.host.name,60),avatar:text(value.host.avatar,30)}:undefined,
    shareToken:typeof value.shareToken==='string'&&/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value.shareToken)?value.shareToken:undefined};
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value;
}
export function privateWhen(event) {
  return `${new Intl.DateTimeFormat('en-US', {month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(event.date + 'T12:00:00Z'))} · ${event.time} Chicago time`;
}
export function eventLink(event, base, when) {
  const snapshot = cleanEvent({...event, id:event.id || `${event.place?.id || 'event'}:${event.title}`, when:when || event.when});
  if (!snapshot) throw new Error('This event cannot be shared yet.');
  const bytes = new TextEncoder().encode(JSON.stringify({v:1,event:snapshot}));
  const payload = btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/, '');
  if (payload.length > 24000) throw new Error('Choose a smaller building footprint to share this event.');
  const url = new URL(base); url.searchParams.delete('share'); url.hash = `event=${payload}`; return url.href;
}
export function readEventLink(hash) {
  if (!hash.startsWith('#event=')) return {event:null,error:''};
  try {
    const payload = hash.slice(7);
    if (payload.length > 24000 || !/^[\w-]+$/.test(payload)) throw new Error();
    const parsed = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(Uint8Array.from(atob(payload.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0))));
    const event = parsed.v === 1 ? cleanEvent(parsed.event) : null;
    if (!event) throw new Error();
    return {event,error:''};
  } catch { return {event:null,error:'This event link is invalid or incomplete. Ask the sender for a new link.'}; }
}
// Center map pins over the selected roof rather than its projected click position.
export function buildingArea(venue) {
  const g = venue.footprint;
  if (!g) return null;
  const points = g.type === 'Polygon' ? g.coordinates.flat() : g.coordinates.flat(2);
  const west = Math.min(...points.map(p=>p[0])) - .000002, east = Math.max(...points.map(p=>p[0])) + .000002;
  const south = Math.min(...points.map(p=>p[1])) - .000002, north = Math.max(...points.map(p=>p[1])) + .000002;
  return {type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]};
}

// Use the roof, rather than the click position, as a custom building's identity.
export function footprintId(geometry) {
  const points = [];
  const visit = value => {
    if (Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)) points.push(value.map(n=>n.toFixed(7)).join(','));
    else if (Array.isArray(value)) value.forEach(visit);
  };
  visit(geometry.coordinates);
  const key = [...new Set(points)].sort().join(';');
  let hash = 2166136261;
  for (let i=0;i<key.length;i++) hash = Math.imul(hash ^ key.charCodeAt(i),16777619);
  return `pin:${(hash >>> 0).toString(36)}`;
}
