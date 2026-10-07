#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SOURCE_URL = 'https://uic.campusgroups.com/ical/uic/ical_uic.ics';
// Resolved lazily: bundled Cloudflare Workers (which reuse parseIcs) have no import.meta.url.
const defaultOutput = () => resolve(dirname(fileURLToPath(import.meta.url)), '../output/uic-events.json');

function unfoldIcs(source) {
  return source.replace(/\r\n[ \t]/g, ' ').split(/\r?\n/);
}

function splitIcsLine(line) {
  const separator = line.indexOf(':');
  if (separator < 0) return null;
  const property = line.slice(0, separator);
  const value = line.slice(separator + 1);
  const semicolon = property.indexOf(';');
  const name = (semicolon < 0 ? property : property.slice(0, semicolon)).toUpperCase();
  const parameters = {};
  if (semicolon >= 0) {
    for (const part of property.slice(semicolon + 1).split(';')) {
      const equals = part.indexOf('=');
      if (equals < 0) continue;
      const key = part.slice(0, equals).toUpperCase();
      parameters[key] = part.slice(equals + 1).replace(/^"|"$/g, '');
    }
  }
  return { name, parameters, value };
}

function decodeQuotedPrintable(value) {
  return value.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/=\r?\n/g, '')
    .replace(/\\n/gi, '\n')
    .replace(/\\N/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function decodeText(value) {
  return decodeQuotedPrintable(value)
    .replace(/[ \t]+\r?\n/g, '\n')
    .replace(/\r?\n[ \t]+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function parseIcsDate(value, timeZone = 'UTC') {
  if (!value) return null;
  const match = value.match(/^(\d{8})T(\d{6})(Z)?$/);
  if (!match) return null;
  const utcMilliseconds = Date.UTC(Number(match[1].slice(0, 4)), Number(match[1].slice(4, 6)) - 1, Number(match[1].slice(6, 8)), Number(match[2].slice(0, 2)), Number(match[2].slice(2, 4)), Number(match[2].slice(4, 6)));
  if (match[3] === 'Z' || timeZone === 'UTC') return new Date(utcMilliseconds).toISOString();
  const wallTime = Date.UTC(Number(match[1].slice(0, 4)), Number(match[1].slice(4, 6)) - 1, Number(match[1].slice(6, 8)), Number(match[2].slice(0, 2)), Number(match[2].slice(2, 4)), Number(match[2].slice(4, 6)));
  return toZonedUtc(wallTime, timeZone);
}

function getTimeZoneOffset(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
  return localAsUtc - date.getTime();
}

function toZonedUtc(wallTime, timeZone) {
  let utc = wallTime;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = getTimeZoneOffset(new Date(utc), timeZone);
    const nextUtc = wallTime - offset;
    if (nextUtc === utc) break;
    utc = nextUtc;
  }
  return new Date(utc).toISOString();
}

function parseIcs(source) {
  const events = [];
  let current = null;
  for (const line of unfoldIcs(source)) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current || !line) continue;
    const property = splitIcsLine(line);
    if (!property) continue;
    const key = property.name;
    if (!Object.hasOwn(current, key)) current[key] = [];
    current[key].push(property);
  }
  return events.map((rawEvent) => {
    const first = (name) => rawEvent[name]?.[0];
    const text = (name) => decodeText(first(name)?.value ?? '');
    const direct = (name) => first(name)?.value;
    const start = parseIcsDate(direct('DTSTART'), first('DTSTART')?.parameters.TZID ?? 'UTC');
    const end = parseIcsDate(direct('DTEND'), first('DTEND')?.parameters.TZID ?? 'UTC');
    const description = text('DESCRIPTION') || null;
    const sourceUrl = normalizeSourceUrl(text('URL'))
      || normalizeSourceUrl(description?.match(/Event Details:\s*(https?:\/\/\S+)/i)?.[1])
      || null;
    const sourceEventId = text('UID') || null;
    const location = text('LOCATION') || null;
    const organizer = text('ORGANIZER') || null;
    const categories = (rawEvent.CATEGORIES ?? []).map((entry) => textFromProperty(entry)).filter(Boolean);
    return {
      sourceEventId,
      sourceUrl,
      title: text('SUMMARY'),
      location,
      description,
      organizer,
      categories,
      startAt: start,
      endAt: end,
      sourceTimestamp: parseIcsDate(direct('LAST-MODIFIED'), first('LAST-MODIFIED')?.parameters.TZID ?? 'UTC'),
      sourceCreatedAt: parseIcsDate(direct('CREATED'), first('CREATED')?.parameters.TZID ?? 'UTC'),
      sourceSequence: Number.parseInt(first('SEQUENCE')?.value ?? '0', 10) || 0,
      sourceStatus: text('STATUS') || null,
      timeZone: first('DTSTART')?.parameters.TZID ?? 'America/Chicago',
    };
  });
}

function normalizeSourceUrl(value) {
  if (!value) return null;
  return value.trim().replace(/([?&]id)["=](\d+)/i, '$1=$2');
}

function textFromProperty(property) {
  return decodeText(property.value);
}

function makeStableId(sourceEventId) {
  const digest = createHash('sha1').update(sourceEventId).digest('hex').slice(0, 20);
  return `event:${digest}`;
}

function normalizeEvent(rawEvent, sourceUrl, generatedAt = new Date().toISOString()) {
  const title = rawEvent.title || 'Untitled UIC Connections event';
  const location = rawEvent.location && rawEvent.location !== 'Sign in to download the location' ? rawEvent.location : null;
  const sourceEventId = rawEvent.sourceEventId || null;
  const sourceEventUrl = normalizeSourceUrl(rawEvent.sourceUrl) || sourceUrl;
  const sourceIdentity = sourceEventId
    ? `uid:${sourceEventId}`
    : rawEvent.sourceUrl
      ? `url:${sourceEventUrl}`
      : `content:${normalizedDuplicateKey({ title, startAt: rawEvent.startAt, location })}`;
  const lastUpdatedAt = rawEvent.sourceTimestamp || rawEvent.sourceCreatedAt || generatedAt;
  const event = {
    id: makeStableId(sourceIdentity),
    title,
    description: rawEvent.description,
    location,
    coordinates: null,
    startAt: rawEvent.startAt,
    endAt: rawEvent.endAt,
    timeZone: rawEvent.timeZone || 'America/Chicago',
    host: rawEvent.organizer && !rawEvent.organizer.startsWith('mailto:') ? { type: 'organization', name: rawEvent.organizer } : null,
    source: { type: 'external', url: sourceEventUrl },
    sourceEventId,
    status: rawEvent.sourceStatus?.toUpperCase() === 'CANCELLED' ? 'cancelled' : 'published',
    categories: rawEvent.categories,
    createdAt: rawEvent.sourceCreatedAt || generatedAt,
    updatedAt: lastUpdatedAt,
    lastCheckedAt: generatedAt,
    lastUpdatedAt,
  };
  return event;
}

function normalizedDuplicateKey(event) {
  return [event.title, event.startAt, event.location].filter(Boolean).join('\u0000').toLocaleLowerCase();
}

function mergeEvents(rawEvents, sourceUrl, generatedAt = new Date().toISOString()) {
  const validEvents = rawEvents.filter((event) => event.startAt);
  const parents = validEvents.map((_, index) => index);
  const indexes = { sourceEventId: new Map(), sourceUrl: new Map(), normalizedContent: new Map() };
  const duplicateReasons = [];

  function find(index) {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  }

  validEvents.forEach((rawEvent, index) => {
    const uid = rawEvent.sourceEventId?.trim();
    const eventUrl = normalizeSourceUrl(rawEvent.sourceUrl);
    const contentKey = normalizedDuplicateKey({
      title: rawEvent.title || 'Untitled UIC Connections event',
      startAt: rawEvent.startAt,
      location: rawEvent.location && rawEvent.location !== 'Sign in to download the location' ? rawEvent.location : null,
    });
    const keys = [
      ['sourceEventId', uid],
      ['sourceUrl', eventUrl],
      ['normalizedContent', contentKey],
    ].filter(([, key]) => key);
    const matches = keys.flatMap(([reason, key]) => {
      const previousIndex = indexes[reason].get(key);
      return previousIndex === undefined ? [] : [{ reason, index: previousIndex }];
    });
    const priorityMatch = matches[0];
    for (const match of matches) union(index, match.index);
    if (priorityMatch) duplicateReasons.push({ reason: priorityMatch.reason, index, sourceEventId: uid || null });
    for (const [reason, key] of keys) {
      if (!indexes[reason].has(key)) indexes[reason].set(key, index);
    }
  });

  const groups = new Map();
  validEvents.forEach((rawEvent, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(rawEvent);
  });
  const winners = new Map();
  for (const [root, group] of groups) {
    const winner = group.reduce((current, candidate) => isNewer(candidate, current) ? candidate : current);
    winners.set(root, normalizeEvent(winner, sourceUrl, generatedAt));
  }

  return {
    events: [...winners.values()],
    duplicateReports: duplicateReasons.map(({ reason, index, sourceEventId }) => ({
      reason,
      sourceEventId,
      keptId: winners.get(find(index)).id,
    })),
    skipped: rawEvents.length - validEvents.length,
  };
}

function isNewer(candidate, existing) {
  const candidateTime = Date.parse(candidate.sourceTimestamp ?? candidate.sourceCreatedAt ?? '') || 0;
  const existingTime = Date.parse(existing.sourceTimestamp ?? existing.sourceCreatedAt ?? '') || 0;
  return candidateTime > existingTime || (candidateTime === existingTime && candidate.sourceSequence > existing.sourceSequence);
}

async function importFeed(sourceUrl = DEFAULT_SOURCE_URL, outputPath = defaultOutput()) {
  const response = await fetch(sourceUrl, { headers: { Accept: 'text/calendar; charset=utf-8' } });
  if (!response.ok) throw new Error(`Unable to fetch UIC Connections feed (${response.status})`);
  const source = await response.text();
  const rawEvents = parseIcs(source);
  const generatedAt = new Date().toISOString();
  const { events, duplicateReports, skipped } = mergeEvents(rawEvents, sourceUrl, generatedAt);
  const output = {
    schemaVersion: 1,
    generatedAt,
    eventCount: events.length,
    source: {
      name: 'UIC Connections',
      url: sourceUrl,
      fetchedAt: generatedAt,
      responseLastModified: response.headers.get('last-modified'),
      feedVersion: 'official-calendar',
    },
    summary: {
      imported: rawEvents.length,
      canonical: events.length,
      duplicates: duplicateReports.length,
      invalid: skipped,
      skipped,
    },
    events,
    duplicateReports,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  return output;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const sourceUrl = process.argv[2] || DEFAULT_SOURCE_URL;
  const outputPath = process.argv[3] || defaultOutput();
  importFeed(sourceUrl, outputPath).then((result) => {
    console.log(`Imported ${result.summary.canonical} events from ${sourceUrl}`);
    console.log(`Duplicates: ${result.summary.duplicates}; skipped: ${result.summary.skipped}`);
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export { importFeed, parseIcs, normalizeEvent, mergeEvents, unfoldIcs, decodeText };
