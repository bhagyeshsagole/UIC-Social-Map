import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calendarFeedUrl, campusTimestamp, parseCampusFeed, upcomingCampusEvents, plainText, eventWhen, monthDates, onCampusDate, dayLabel} from '../src/campusEvents.js';
import {fetchCampusEvents} from '../scripts/campus-events.mjs';
import {buildIndex, searchIndex} from '../src/search.js';

// Synthetic feed records exercise parsing without copying organizers or attendees.
const row = (overrides = {}) => ({id:123, title:'Synthetic Arts &amp; Games', groupName:'Synthetic Club',
  eventDateStr:'2026-10-06', eventEndDateStr:'2026-10-06', startTime:'4:30pm', endTime:'6:00pm CDT (GMT-5)',
  rsvpLinkCalendar:'https://uic.campusgroups.com/test/rsvp?id=123', event_location:'Student Center East',
  event_address:'750 S Halsted St', event_city:'Chicago', event_state:'IL', event_zipcode:'60607', ...overrides});

test('calendar range uses Chicago month, leap years, and year rollover', () => {
  const url = date => new URL(calendarFeedUrl(new Date(date)));
  assert.equal(url('2026-11-01T04:30:00Z').searchParams.get('end_date'), '2026-10-31');
  assert.equal(url('2028-02-15T18:00:00Z').searchParams.get('end_date'), '2028-02-29');
  assert.equal(url('2027-01-01T05:30:00Z').searchParams.get('start_date'), '2026-12-01');
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
test('only not-yet-started current-month events survive; past dates never reappear from cached data', () => {
  const events = parseCampusFeed({events:[row({id:1, eventDateStr:'2026-10-04', eventEndDateStr:'2026-10-04'}),
    row({id:2, eventDateStr:'2026-10-05', eventEndDateStr:'2026-10-05', startTime:'9:00am'}),
    row({id:3, eventDateStr:'2026-10-05', eventEndDateStr:'2026-10-05'}), row({id:4}),
    row({id:5, eventDateStr:'2026-11-01', eventEndDateStr:'2026-11-01'})]}).events;
  assert.deepEqual(upcomingCampusEvents(events, new Date('2026-10-05T20:00:00Z')).map(e=>e.id), ['campusgroups-3','campusgroups-4']);
  assert.deepEqual(upcomingCampusEvents(events, new Date('2026-10-06T21:30:01Z')), []);
  assert.deepEqual(upcomingCampusEvents(events, new Date('2026-11-01T05:00:00Z')).map(e=>e.id), ['campusgroups-5']);
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
    assert.ok(e.startDate.startsWith(data.month));
    assert.match(e.url, /^https:\/\/uic\.campusgroups\.com\//);
    assert.ok(!('attendees' in e) && !('author_id' in e) && !('ticketsSold' in e));
  }
});
test('date picker covers the Chicago month and multi-day events match every day they span',()=>{
  const {lead,dates}=monthDates(new Date('2026-10-05T17:00:00Z'));
  assert.equal(lead,4);assert.equal(dates.length,31);assert.equal(dates[0],'2026-10-01');assert.equal(dates[30],'2026-10-31');
  assert.equal(monthDates(new Date('2026-11-01T04:30:00Z')).dates[0],'2026-10-01','late Oct 31 in Chicago is still October');
  const span={startDate:'2026-10-10',endDate:'2026-10-12'};
  assert.deepEqual(['2026-10-09','2026-10-10','2026-10-11','2026-10-12','2026-10-13'].map(d=>onCampusDate(span,d)),[false,true,true,true,false]);
  assert.equal(onCampusDate({startDate:'2026-10-10'},'2026-10-10'),true);
  assert.equal(dayLabel('2026-10-14'),'Wed, Oct 14');
});
