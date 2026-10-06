import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeText, mergeEvents, parseIcs } from './uic-connections-importer.mjs';

const feed = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:example-1@campusgroups.com\r\nDTSTAMP:20261005T210000Z\r\nLAST-MODIFIED:20261005T210000Z\r\nDTSTART:20260710T190000Z\r\nDTEND:20260710T220000Z\r\nSUMMARY;ENCODING=QUOTED-PRINTABLE:Free+Pop-Up+Zumba\r\nLOCATION:Sport and Fitness Center, 737 S. Halsted St.\r\nURL:https://example.test/event/1\r\nDESCRIPTION:Line one\\nLine two\\, with punctuation\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:example-1@campusgroups.com\r\nDTSTAMP:20261006T210000Z\r\nLAST-MODIFIED:20261006T210000Z\r\nDTSTART:20260710T190000Z\r\nDTEND:20260710T220000Z\r\nSUMMARY:Free Pop-Up Zumba Updated\r\nLOCATION:Sport and Fitness Center, 737 S. Halsted St.\r\nURL:https://example.test/event/1\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:example-2@campusgroups.com\r\nDTSTART:20260711T190000Z\r\nDTEND:20260711T220000Z\r\nSUMMARY:Same event\r\nLOCATION:Sport and Fitness Center, 737 S. Halsted St.\r\nURL:https://example.test/event/2\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;

test('unfolds ICS lines and decodes quoted-printable text', () => {
  const folded = 'BEGIN:VEVENT\r\nSUMMARY:First line\r\n second line\r\nEND:VEVENT\r\n';
  const quotedPrintable = 'BEGIN:VEVENT\r\nSUMMARY;ENCODING=QUOTED-PRINTABLE:First line=20=0Asecond\\nNext\\, item\r\nEND:VEVENT\r\n';
  assert.equal(parseIcs(folded)[0].title, 'First line second line');
  assert.equal(decodeText(parseIcs(quotedPrintable)[0].title), 'First line\nsecond\nNext, item');
});

test('parses UTC timestamps and preserves optional feed fields', () => {
  const [event] = parseIcs(feed);
  assert.equal(event.startAt, '2026-07-10T19:00:00.000Z');
  assert.equal(event.endAt, '2026-07-10T22:00:00.000Z');
  assert.equal(event.sourceEventId, 'example-1@campusgroups.com');
  assert.equal(event.description, 'Line one\nLine two, with punctuation');
});

test('uses source UID before normalized content for duplicate precedence', () => {
  const parsed = parseIcs(feed);
  const result = mergeEvents(parsed, 'https://example.test/ical');
  assert.equal(result.events.length, 2);
  assert.equal(result.duplicateReports.length, 1);
  assert.equal(result.duplicateReports[0].reason, 'sourceEventId');
  assert.equal(result.events[0].title, 'Free Pop-Up Zumba Updated');
});

test('deduplicates identical feed reruns and updates matching source events', () => {
  const parsed = parseIcs(feed);
  const singleRun = mergeEvents(parsed, 'https://example.test/ical', '2026-10-06T12:00:00.000Z');
  const repeatedRun = mergeEvents([...parsed, ...parsed], 'https://example.test/ical', '2026-10-06T12:00:00.000Z');
  assert.equal(repeatedRun.events.length, singleRun.events.length);
  assert.deepEqual(repeatedRun.events.map((event) => event.id), singleRun.events.map((event) => event.id));
  assert.equal(repeatedRun.events.find((event) => event.sourceEventId === 'example-1@campusgroups.com').title, 'Free Pop-Up Zumba Updated');
});

test('uses event URL to deduplicate when source UIDs differ', () => {
  const parsed = parseIcs(feed);
  const first = { ...parsed[0], sourceEventId: 'first-id', sourceTimestamp: '2026-10-05T00:00:00.000Z' };
  const updated = { ...parsed[0], sourceEventId: 'second-id', sourceTimestamp: '2026-10-06T00:00:00.000Z', title: 'Updated through URL' };
  const result = mergeEvents([first, updated], 'https://example.test/ical', '2026-10-06T12:00:00.000Z');
  assert.equal(result.events.length, 1);
  assert.equal(result.duplicateReports[0].reason, 'sourceUrl');
  assert.equal(result.events[0].title, 'Updated through URL');
  assert.equal(result.events[0].source.url, 'https://example.test/event/1');
});

test('normalizes source timestamps to contract fields and tolerates missing optional fields', () => {
  const sparse = parseIcs('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:sparse-id\r\nDTSTART:20260710T190000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n');
  const generatedAt = '2026-10-06T12:00:00.000Z';
  const result = mergeEvents(sparse, 'https://example.test/ical', generatedAt);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].title, 'Untitled UIC Connections event');
  assert.equal(result.events[0].description, null);
  assert.equal(result.events[0].location, null);
  assert.equal(result.events[0].createdAt, generatedAt);
  assert.equal(result.events[0].updatedAt, generatedAt);
  assert.equal(result.events[0].lastCheckedAt, generatedAt);
  assert.equal(result.events[0].lastUpdatedAt, generatedAt);
});

test('does not invent location coordinates or normalize unavailable locations', () => {
  const [event] = parseIcs('BEGIN:VEVENT\r\nUID:x\r\nDTSTART:20260710T190000Z\r\nLOCATION: Sign in to download the location\r\nEND:VEVENT');
  const normalized = mergeEvents([event], 'https://example.test/ical').events[0];
  assert.equal(normalized.location, null);
  assert.equal(normalized.coordinates, null);
});
