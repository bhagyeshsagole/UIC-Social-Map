// Match public street addresses only. Titles/hosts never reveal a private venue.
export function addressKey(value) {
  const aliases = {north:'n', south:'s', east:'e', west:'w', street:'st', avenue:'ave', road:'rd', drive:'dr', place:'pl', boulevard:'blvd'};
  const text = String(value || '').toLowerCase().replace(/[.]/g, '').replace(/\b(north|south|east|west|street|avenue|road|drive|place|boulevard)\b/g, word => aliases[word]);
  const match = text.match(/\b(\d{1,6})\s+((?:[nsew]\s+)?[a-z]+(?:\s+[a-z]+)*)(?=,|$|\s+\d)/);
  if (!match) return null;
  const street = match[2].split(/\s+(?:st|ave|rd|dr|pl|blvd|room|suite|floor)\b/)[0].trim();
  return `${match[1]} ${street}`;
}

export function resolveEventVenue(event, venues) {
  if (event.place) return venues.find(v => v.placeIds?.includes(event.place.id)) || null;
  if (!event.hasPublicLocation) return null;
  const key = addressKey(event.location);
  if (!key) return null;
  const matches = venues.filter(v => [v.address, ...(v.aliases || [])].some(address => addressKey(address) === key));
  return matches.length === 1 ? matches[0] : null;
}

export function eventBuildingColor(night, venueIds = [], privateVenues = []) {
  const gradient = (low, middle, high) => ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 7], 0, low, 25, middle, 80, high];
  const purple = gradient(night ? '#7542bb' : '#7944bb', night ? '#b27cff' : '#a365e7', '#d4b0ff');
  const red = gradient(night ? '#9f263b' : '#b5263b', night ? '#da4256' : '#e84658', night ? '#ff7982' : '#ff7d85');
  const active = venueIds.length ? ['any', ...venueIds.map(id => ['in', `|${id}|`, ['coalesce', ['get', 'event_venues'], '']])] : false;
  const yellow = gradient('#c49a22', '#edc843', '#fff19a');
  // Distance supports polygon features; within only supports points/lines in this SDK.
  // Tile IDs are only local, so pair ID matching with proximity to the selected roof.
  const privateMatch = privateVenues.length ? ['any', ...privateVenues.map(v => v.footprint ? ['all', ...(v.featureId !== undefined ? [['==', ['id'], v.featureId]] : []), ['<', ['distance', v.footprint], 0.2]] : ['in', `|${v.id}|`, ['coalesce', ['get', 'event_venues'], '']])] : false;
  return ['case', privateMatch, yellow, active, purple, ['==', ['get', 'uic'], true], red, night ? '#817568' : '#c7b9a6'];
}

// Upcoming events grouped by venue, soonest first, for building previews and venue panels.
export function groupByVenue(events) {
  const groups = {};
  for (const e of events) if (e.venue) (groups[e.venue.id] ||= {venue:e.venue, events:[]}).events.push(e);
  for (const group of Object.values(groups)) group.events.sort((a, b) => (a.start || '').localeCompare(b.start || '') || a.title.localeCompare(b.title));
  return groups;
}

// Building tiles list venues as |id|id|; only venues with upcoming events count.
export function buildingVenues(value, groups) {
  return String(value || '').split('|').filter(id => groups[id]);
}
