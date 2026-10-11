import SunCalc from 'suncalc';
export const TIMEZONE = 'America/Chicago';
export const UIC = [-87.6475, 41.8719];
export function chicagoDate(date = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function solarState(now = new Date()) {
  // Noon in Chicago always falls within 18:00 UTC, including DST transitions.
  const times = SunCalc.getTimes(new Date(chicagoDate(now)+'T18:00:00Z'), UIC[1], UIC[0]);
  return {...times, night:now < times.sunrise || now >= times.sunset};
}
export function clockTime(date) { return new Intl.DateTimeFormat('en-US',{timeZone:TIMEZONE,hour:'numeric',minute:'2-digit'}).format(date); }
// A day is null (closed), one [open, close] range, or a list of ranges for split shifts.
export function dayRanges(range) { return !range ? [] : typeof range[0] === 'number' ? [range] : range; }
export function openingStatus(place, now = new Date()) {
  if (!place.schedule) return {label:'Check schedule',open:false};
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:TIMEZONE,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const val=t=>parts.find(p=>p.type===t).value;
  const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(val('weekday'));
  const range=place.schedule[day], minute=Number(val('hour'))*60+Number(val('minute'));
  // Late-night hours run past midnight (e.g. 9:45am–4am is stored as [585,1680]), so also check yesterday's range.
  const late=place.schedule[(day+6)%7], open=dayRanges(range).some(r=>minute>=r[0]&&minute<r[1]) || dayRanges(late).some(r=>r[1]>1440&&minute<r[1]-1440);
  return {label:open?'Usually open now':'Usually closed now',open};
}
export function currentEvents(place, now = new Date()) { const today=chicagoDate(now); return place.events.filter(e=>e.end>=today); }
export function directions(place) { return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.address?.startsWith('Map location')?`${place.coords[1]},${place.coords[0]}`:`${place.name}, ${place.address}, Chicago IL`); }
export const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function chicagoDay(now = new Date()) { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:TIMEZONE,weekday:'short'}).format(now)); }
export function formatMinutes(m) { if (m === 720) return 'noon'; if (m % 1440 === 0) return 'midnight'; const h = Math.floor(m / 60) % 24, min = m % 60; return `${h % 12 || 12}${min ? ':' + String(min).padStart(2,'0') : ''}${h < 12 ? 'am' : 'pm'}`; }
// One day's regular hours as display text; `weekly` labels cover places without open/close ranges (e.g. run meetups).
export function dayHours(place, day) { if (place.weekly) return place.weekly[day]; if (!place.schedule) return null; const r = dayRanges(place.schedule[day]); return r.length ? r.map(x => `${formatMinutes(x[0])}–${formatMinutes(x[1])}`).join(', ') : 'Closed'; }
export function weekHours(place) { return [1,2,3,4,5,6,0].map(d => ({day:DAYS[d], index:d, hours:dayHours(place, d)})); }
