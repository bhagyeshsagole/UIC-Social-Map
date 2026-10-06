export const CAMPUS_CALENDAR = 'https://uic.campusgroups.com/calendar#month';
export const CAMPUS_ORIGIN = 'https://uic.campusgroups.com';
const zone = 'America/Chicago';
export function campusDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
}
export function campusMonth(now = new Date()) { return campusDate(now).slice(0, 7); }
// The calendar covers this Chicago month and the next eleven.
export const CAMPUS_MONTHS = 12;
export function addMonths(month, count) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1 + count, 1)).toISOString().slice(0, 7);
}
function monthLength(month) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}
export function calendarFeedUrl(now = new Date()) {
  const month = campusMonth(now), last = addMonths(month, CAMPUS_MONTHS - 1);
  const query = new URLSearchParams({view:'month', start_date:`${month}-01`, end_date:`${last}-${monthLength(last)}`, etl:'', club_id:'', topic_id:'', search:'', range:'', limit:'', filterBy:'', calendarView:'month'});
  return `${CAMPUS_ORIGIN}/mobile_ws/v17/mobile_calendar.aspx?${query}`;
}
export function plainText(value) {
  const entities = {amp:'&', quot:'"', apos:"'", lt:'<', gt:'>', nbsp:' ', ndash:'–', mdash:'—', rsquo:'’', lsquo:'‘', ldquo:'“', rdquo:'”'};
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] !== '#') return entities[code.toLowerCase()] ?? match;
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  }).replace(/\s+/g, ' ').trim();
}
export function publicUrl(value, sameOrigin = false) {
  if (!value) return null;
  try {
    const url = new URL(plainText(value), CAMPUS_ORIGIN);
    return url.protocol === 'https:' && !url.username && !url.password && (!sameOrigin || url.origin === CAMPUS_ORIGIN) ? url.href : null;
  } catch { return null; }
}
// The feed's clock strings are campus local time; never use the visitor's timezone.
export function campusTimestamp(date, time) {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)\b/i.exec(plainText(time));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !match) return null;
  const [year, month, day] = date.split('-').map(Number), hour = +match[1], minute = +match[2];
  if (hour < 1 || hour > 12 || minute > 59 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  const wall = Date.UTC(year, month - 1, day, hour % 12 + (/pm/i.test(match[3]) ? 12 : 0), minute);
  let utc = wall;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:zone, timeZoneName:'longOffset'}).formatToParts(new Date(utc));
    const offset = /GMT([+-])(\d{2}):(\d{2})/.exec(parts.find(p => p.type === 'timeZoneName').value);
    if (!offset) return null;
    utc = wall - (offset[1] === '+' ? 1 : -1) * (+offset[2] * 60 + +offset[3]) * 60000;
  }
  return new Date(utc).toISOString();
}
export const NO_LOCATION = 'Location on UIC Connection';
// Map links need a street address; private, online and to-be-announced places never get one.
export function placeFields(location, url, hasAddress = /\b\d{1,6}\s+[NSEW]\.?\s+\w/i.test(location)) {
  const canMap = hasAddress && !/private|sign in|log in|online|virtual|zoom|https?:|\bTBD\b|to be (announced|determined)/i.test(location);
  return {location:location || NO_LOCATION, locationUrl:canMap ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : url, hasPublicLocation:canMap};
}
export function parseCampusFeed(payload) {
  if (!payload || !Array.isArray(payload.events)) throw new Error('CampusGroups returned an unexpected calendar response.');
  const events = new Map();
  let skippedCount = 0;
  for (const row of payload.events) {
    if (row.isDisplay === false || row.isHideFromCalendar === true || row.isCancelled === true) continue;
    const id = String(row.id ?? ''), title = plainText(row.title), url = publicUrl(row.rsvpLinkCalendar, true);
    const start = campusTimestamp(row.eventDateStr, row.startTime), end = campusTimestamp(row.eventEndDateStr, row.endTime);
    if (!/^\d+$/.test(id) || !title || !url || !start || !end || end < start) { skippedCount++; continue; }
    const venue = plainText(row.event_location), address = [row.event_address, row.event_city, row.event_state, row.event_zipcode].map(plainText).filter(Boolean).join(', ');
    const location = [venue, address].filter(Boolean).join(' · ');
    events.set(id, {id:`campusgroups-${id}`, title, organizer:plainText(row.groupName), start, end,
      startDate:row.eventDateStr, endDate:row.eventEndDateStr, ...placeFields(location, url, Boolean(plainText(row.event_address))), url, source:'UIC Connection'});
  }
  return {events:[...events.values()], skippedCount, sourceCount:payload.events.length};
}
// Events stay listed until they end, so multi-week series already underway still show.
// The JSON feed leaves some public locations blank. Fill them from the official
// calendar file (same event title and start), then from reviewed description quotes.
// Locations UIC keeps behind sign-in stay hidden.
export function addCampusLocations(events, calendar = [], notes = {}) {
  const key = (title, start) => `${plainText(title).toLowerCase()}|${start}`;
  const listed = new Map(calendar.filter(e => e.location && !/\bTBD\b|sign in/i.test(e.location)).map(e => [key(e.title, e.startAt), plainText(e.location).replace(/,\s*United States$/, '')]));
  return events.map(e => {
    if (e.location !== NO_LOCATION) return e;
    const fromCalendar = listed.get(key(e.title, e.start)), location = fromCalendar || notes[e.id]?.location;
    if (!location) return e;
    return {...e, ...placeFields(/^online event$/i.test(location) ? 'Online event' : location, e.url), locationSource:fromCalendar ? 'UIC Connection calendar file' : 'Event description'};
  });
}
export function upcomingCampusEvents(events, now = new Date()) {
  const last = addMonths(campusMonth(now), CAMPUS_MONTHS - 1);
  return events.filter(e => Date.parse(e.end) > +now && (e.startDate || e.start.slice(0, 10)).slice(0, 7) <= last)
    .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}
export function eventWhen(event) {
  const date = new Intl.DateTimeFormat('en-US', {timeZone:zone, weekday:'short', month:'short', day:'numeric'});
  const time = new Intl.DateTimeFormat('en-US', {timeZone:zone, hour:'numeric', minute:'2-digit'});
  const start = new Date(event.start), end = new Date(event.end);
  return `${date.format(start)} · ${time.format(start)}–${campusDate(start) === campusDate(end) ? '' : `${date.format(end)} · `}${time.format(end)} CT`;
}
// A multi-day event appears on every Chicago date it covers.
export function onCampusDate(event, date) {
  const start = (event.startDate || event.start || '').slice(0, 10), end = (event.endDate || event.end || start).slice(0, 10);
  return start <= date && date <= end;
}
export function monthDates(now = new Date(), month = campusMonth(now)) {
  const [year, m] = month.split('-').map(Number);
  return {lead:new Date(Date.UTC(year, m - 1, 1)).getUTCDay(), dates:Array.from({length:monthLength(month)}, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)};
}
export function monthLabel(month) {
  return new Intl.DateTimeFormat('en-US', {timeZone:'UTC', month:'long', year:'numeric'}).format(new Date(`${month}-15T12:00:00Z`));
}
export function dayLabel(date) {
  return new Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'short', month:'short', day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
}
