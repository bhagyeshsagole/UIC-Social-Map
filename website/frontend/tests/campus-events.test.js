import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addCampusLocations, NO_LOCATION, addMonths, calendarFeedUrl, campusTimestamp, parseCampusFeed, upcomingCampusEvents, plainText, eventWhen, monthDates, monthLabel, onCampusDate, dayLabel} from '../src/campusEvents.js';
import {fetchCampusEvents} from '../scripts/campus-events.mjs';
import {buildIndex, searchIndex} from '../src/search.js';

// Synthetic feed records exercise parsing without copying organizers or attendees.
const row = (overrides = {}) => ({id:123, title:'Synthetic Arts &amp; Games', groupName:'Synthetic Club',
  eventDateStr:'2026-10-06', eventEndDateStr:'2026-10-06', startTime:'4:30pm', endTime:'6:00pm CDT (GMT-5)',
  rsvpLinkCalendar:'https://uic.campusgroups.com/test/rsvp?id=123', event_location:'Student Center East',
  event_address:'750 S Halsted St', event_city:'Chicago', event_state:'IL', event_zipcode:'60607', ...overrides});

test('calendar range covers twelve Chicago months, leap years, and year rollover', () => {
  const url = date => new URL(calendarFeedUrl(new Date(date)));
  assert.equal(url('2026-11-01T04:30:00Z').searchParams.get('start_date'), '2026-10-01');
  assert.equal(url('2026-11-01T04:30:00Z').searchParams.get('end_date'), '2027-09-30');
  assert.equal(url('2027-03-15T18:00:00Z').searchParams.get('end_date'), '2028-02-29');
  assert.equal(url('2027-01-01T05:30:00Z').searchParams.get('start_date'), '2026-12-01');
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
});
test('source times convert from Chicago independently of visitor timezone and DST', () => {
  assert.equal(campusTimestamp('2026-10-06', '4:30pm'), '2026-10-06T21:30:00.000Z');
  assert.equal(campusTimestamp('2026-12-06', '4:30pm'), '2026-12-06T22:30:00.000Z');
  assert.equal(campusTimestamp('2026-10-06', '12:00am'), '2026-10-06T05:00:00.000Z');
  assert.equal(campusTimestamp('2026-10-06', '12:00pm'), '2026-10-06T17:00:00.000Z');
  assert.equal(campusTimestamp('2026-02-30', '4:30pm'), null);
  assert.equal(campusTimestamp('2026-10-06', 'TBD'), null);
});
test('parser decodes text, deduplicates IDs, retains public venues and safe official actions', () => {
  const result = parseCampusFeed({events:[row(), row(), row({id:124, isDisplay:false}), row({id:125, isCancelled:true})]});
  assert.equal(result.events.length, 1);
  const event = result.events[0];
  assert.equal(event.title, 'Synthetic Arts & Games');
  assert.match(event.location, /Student Center East.*750 S Halsted/);
  assert.match(event.locationUrl, /^https:\/\/www.google.com\/maps\/search/);
  assert.equal(event.hasPublicLocation, true);
  assert.match(eventWhen(event), /Tue, Oct 6 · 4:30 PM–6:00 PM CT/);
  assert.equal(plainText('Sparky&#39;s &#127923;'), "Sparky's 🎳");
  assert.equal(parseCampusFeed({events:[row({rsvpLinkCalendar:'javascript:alert(1)'})]}).skippedCount, 1);
  assert.equal(parseCampusFeed({events:[row({rsvpLinkCalendar:'https://other.example/rsvp'})]}).skippedCount, 1);
});
test('missing, private, and virtual locations link to the source without guessed map destinations', () => {
  for (const value of ['', 'Private Location (sign in to display)', 'Online on Zoom', 'TBD']) {
    const event = parseCampusFeed({events:[row({event_location:'', event_address:value, event_city:'', event_state:'', event_zipcode:''})]}).events[0];
    assert.equal(event.hasPublicLocation, false);
    assert.equal(event.locationUrl, event.url);
  }
});
test('events stay listed until they end, across the twelve-month window; ended events never reappear from cached data', () => {
  const events = parseCampusFeed({events:[row({id:1, eventDateStr:'2026-10-04', eventEndDateStr:'2026-10-04'}),
    row({id:2, eventDateStr:'2026-10-05', eventEndDateStr:'2026-10-05', startTime:'9:00am', endTime:'10:00am'}),
    row({id:3, eventDateStr:'2026-10-05', eventEndDateStr:'2026-10-05'}), row({id:4}),
    row({id:5, eventDateStr:'2026-11-01', eventEndDateStr:'2026-11-01'}),
    row({id:6, eventDateStr:'2026-08-24', eventEndDateStr:'2027-05-10'}),
    row({id:7, eventDateStr:'2027-10-01', eventEndDateStr:'2027-10-01'})]}).events;
  assert.deepEqual(upcomingCampusEvents(events, new Date('2026-10-05T20:00:00Z')).map(e=>e.id), ['campusgroups-6','campusgroups-3','campusgroups-4','campusgroups-5'], 'a series already underway stays; next month is included; month 13 is not');
  assert.deepEqual(upcomingCampusEvents(events, new Date('2026-10-05T22:00:00Z')).map(e=>e.id), ['campusgroups-6','campusgroups-3','campusgroups-4','campusgroups-5'], 'an event in progress stays until it ends');
  assert.deepEqual(upcomingCampusEvents(events, new Date('2026-10-06T23:00:01Z')).map(e=>e.id), ['campusgroups-6','campusgroups-5']);
  assert.deepEqual(upcomingCampusEvents(events, new Date('2027-05-11T05:00:00Z')).map(e=>e.id), ['campusgroups-7']);
});
test('import rejects login HTML, failed requests, and invalid schemas rather than overwriting good data', async () => {
  const now = new Date('2026-10-05T20:00:00Z');
  await assert.rejects(fetchCampusEvents(now, async () => new Response('<html>Sign in</html>')));
  await assert.rejects(fetchCampusEvents(now, async () => new Response('{}')));
  await assert.rejects(fetchCampusEvents(now, async () => new Response('', {status:503})));
  await assert.rejects(fetchCampusEvents(now, async () => new Response(JSON.stringify({events:[row({startTime:'unknown'})]}))));
  const data = await fetchCampusEvents(now, async () => new Response(JSON.stringify({events:[row()]})));
  assert.equal(data.events.length, 1);
  assert.equal(data.month, '2026-10');
});
test('CampusGroups events are searchable by title, organizer, and venue without a place pin', () => {
  const events = parseCampusFeed({events:[row()]}).events;
  const items = buildIndex({places:[], events});
  for (const q of ['arts', 'synthetic club', 'halsted']) {
    const result = searchIndex(items, q).find(g=>g.group==='Events').items[0];
    assert.equal(result.kind, 'campus-event');
    assert.equal(result.event.url, events[0].url);
  }
});
test('published snapshot stores event facts and provenance, with no attendance or author records', () => {
  const data = JSON.parse(readFileSync(new URL('../public/campus-events.json', import.meta.url)));
  assert.equal(data.schemaVersion, 1);
  assert.ok(Number.isFinite(Date.parse(data.fetchedAt)));
  assert.equal(new Set(data.events.map(e=>e.id)).size, data.events.length);
  for (const e of data.events) {
    assert.ok(e.endDate >= `${data.month}-01` && e.startDate <= `${addMonths(data.month, 11)}-31`);
    assert.match(e.url, /^https:\/\/uic\.campusgroups\.com\//);
    assert.ok(!('attendees' in e) && !('author_id' in e) && !('ticketsSold' in e));
  }
});
test('date picker covers the Chicago month and multi-day events match every day they span',()=>{
  const {lead,dates}=monthDates(new Date('2026-10-05T17:00:00Z'));
  assert.equal(lead,4);assert.equal(dates.length,31);assert.equal(dates[0],'2026-10-01');assert.equal(dates[30],'2026-10-31');
  assert.equal(monthDates(new Date('2026-11-01T04:30:00Z')).dates[0],'2026-10-01','late Oct 31 in Chicago is still October');
  const feb=monthDates(new Date('2027-10-05T17:00:00Z'),'2028-02');
  assert.equal(feb.dates.length,29);assert.equal(feb.lead,2);assert.equal(monthLabel('2027-01'),'January 2027');
  const span={startDate:'2026-10-10',endDate:'2026-10-12'};
  assert.deepEqual(['2026-10-09','2026-10-10','2026-10-11','2026-10-12','2026-10-13'].map(d=>onCampusDate(span,d)),[false,true,true,true,false]);
  assert.equal(onCampusDate({startDate:'2026-10-10'},'2026-10-10'),true);
  assert.equal(dayLabel('2026-10-14'),'Wed, Oct 14');
});
test('blank feed locations fill from the official calendar file, then reviewed description quotes; private ones stay hidden', async () => {
  const blank = row({event_location:'', event_address:'', event_city:'', event_state:'', event_zipcode:''});
  const events = parseCampusFeed({events:[blank, row({...blank, id:124, title:'Synthetic Yoga'}), row({...blank, id:125, title:'Synthetic Private'}),
    row({...blank, id:126, title:'Synthetic TBD'}), row({id:127, title:'Synthetic Listed'})]}).events;
  const at = events[0].start;
  const calendar = [{title:'Synthetic Arts & Games', startAt:at, location:'SCE 605, 750 S Halsted St., Chicago, IL 60607, United States'},
    {title:'Synthetic Yoga', startAt:at, location:'Online Event'}, {title:'Synthetic Private', startAt:at, location:null},
    {title:'Synthetic TBD', startAt:at, location:'TBD'}, {title:'Synthetic Listed', startAt:at, location:'Somewhere else, 1 W Elm St'}];
  const notes = {'campusgroups-126':{location:'Room 301, Student Center East, 750 S Halsted St, Chicago, IL 60607'}, 'campusgroups-125':undefined};
  const [arts, yoga, hidden, tbd, listed] = addCampusLocations(events, calendar, notes);
  assert.equal(arts.location, 'SCE 605, 750 S Halsted St., Chicago, IL 60607');
  assert.equal(arts.hasPublicLocation, true);
  assert.equal(arts.locationSource, 'UIC Connection calendar file');
  assert.match(arts.locationUrl, /^https:\/\/www.google.com\/maps\/search/);
  assert.equal(yoga.location, 'Online event');
  assert.equal(yoga.hasPublicLocation, false, 'online events get no map link');
  assert.equal(yoga.locationUrl, yoga.url);
  assert.equal(hidden.location, NO_LOCATION, 'sign-in locations are never guessed');
  assert.equal(tbd.locationSource, 'Event description', 'TBD in the calendar file falls through to a reviewed quote');
  assert.equal(listed.location, events[4].location, 'a location from the main feed is never replaced');
});
test('every reviewed description location names a street address or an online event, with its source quote', () => {
  const {events} = JSON.parse(readFileSync(new URL('../src/campus-event-locations.json', import.meta.url)));
  for (const [id, note] of Object.entries(events)) {
    assert.match(id, /^campusgroups-\d+$/);
    assert.ok(note.quote, id);
    assert.ok(/\b\d{1,6} [NSEW] \w/.test(note.location) || note.location === 'Online event', id);
    assert.ok(!/https?:|zoom\.us/i.test(note.location + note.quote), 'meeting links are not copied');
  }
});
test('the import keeps working when the calendar file is unavailable', async () => {
  const now = new Date('2026-10-05T20:00:00Z');
  const fetcher = async url => String(url).endsWith('.ics') ? new Response('', {status:503}) : new Response(JSON.stringify({events:[row()]}));
  assert.equal((await fetchCampusEvents(now, fetcher)).events.length, 1);
});
