export const CAMPUS_CALENDAR = 'https://uic.campusgroups.com/calendar#month';
export const CAMPUS_ORIGIN = 'https://uic.campusgroups.com';
const zone = 'America/Chicago';
export function campusDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
}
export function campusMonth(now = new Date()) { return campusDate(now).slice(0, 7); }
export function calendarFeedUrl(now = new Date()) {
  const month = campusMonth(now), [year, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const query = new URLSearchParams({view:'month', start_date:`${month}-01`, end_date:`${month}-${last}`, etl:'', club_id:'', topic_id:'', search:'', range:'', limit:'', filterBy:'', calendarView:'month'});
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
    const canMap = Boolean(plainText(row.event_address)) && !/private|sign in|log in|online|virtual|zoom|https?:|\bTBD\b|to be (announced|determined)/i.test(location);
    events.set(id, {id:`campusgroups-${id}`, title, organizer:plainText(row.groupName), start, end,
      startDate:row.eventDateStr, endDate:row.eventEndDateStr, location:location || 'Location on UIC Connection',
      locationUrl:canMap ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : url,
      hasPublicLocation:canMap, url, source:'UIC Connection'});
  }
  return {events:[...events.values()], skippedCount, sourceCount:payload.events.length};
}
export function upcomingCampusEvents(events, now = new Date()) {
  const month = campusMonth(now);
  return events.filter(e => e.startDate?.startsWith(month) && Date.parse(e.start) >= +now)
    .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}
export function eventWhen(event) {
  const date = new Intl.DateTimeFormat('en-US', {timeZone:zone, weekday:'short', month:'short', day:'numeric'});
  const time = new Intl.DateTimeFormat('en-US', {timeZone:zone, hour:'numeric', minute:'2-digit'});
  const start = new Date(event.start), end = new Date(event.end);
  return `${date.format(start)} · ${time.format(start)}–${campusDate(start) === campusDate(end) ? '' : `${date.format(end)} · `}${time.format(end)} CT`;
}
