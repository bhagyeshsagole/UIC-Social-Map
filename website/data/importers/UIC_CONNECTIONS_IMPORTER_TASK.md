# UIC Connections local ICS importer

- [x] **B11 · Implement the importer.** Owner: Hassan. Status: DONE. The local importer is a data-quality utility, not a backend service or scheduler.

## Scope

Create a Node.js command that reads the official UIC Connections calendar feed, parses its ICS events, normalizes them to the agreed event shape, detects duplicates, and writes one local JSON document under `website/data/output/`.

The importer must not create a database, deploy a job, persist raw feed content, add authentication, expose a web endpoint, or modify the frontend. The generated JSON is a development artifact until the team agrees on a later storage/API integration.

## Work

1. Parse RFC 5545 line folding, escaped text, and common `DTSTART`/`DTEND` values without requiring a third-party calendar package.
2. Preserve the source UID, source URL, organizer, event category, event status, and source timestamps. Decode quoted-printable text and normalize whitespace.
3. Convert UTC timestamps to RFC 3339 timestamps and retain `America/Chicago` as the event time zone. Do not invent a location coordinate when the feed only says "Sign in to download the location".
4. Detect duplicates by source UID/source event ID first, then source URL, then normalized title/start/location. Keep the newest `LAST-MODIFIED` record and produce a deterministic conflict report.
5. Write `website/data/output/uic-events.json` with the feed metadata, import timestamp, source, canonical event array, and duplicate/collision counts.
6. Add fixtures and unit tests for folded lines, quoted-printable text, UTC conversion, missing optional fields, duplicate precedence, updated-event replacement, and idempotent reruns.
7. Run the importer against the official feed and record the live event count, source response date, and any feed-specific limitations.

The agreed UIC Connections refresh cadence is monthly. Manual local runs are available now; production scheduling is deferred until Bhagesh completes storage integration so scheduled imports have an approved destination. Chicago place-content refresh remains the separate weekly B10 task.

## Acceptance checks

- [x] A real official feed can be parsed and imported without a calendar dependency.
- [x] A second run produces the same canonical event set and does not create duplicates.
- [x] Duplicate precedence is documented and test-backed.
- [x] Updated source events replace their prior canonical record when the source identity is stable.
- [x] Invalid or incomplete events are reported without silently inventing facts.
- [x] The generated output contains only local data and no credentials, user data, or personal messages.
- [x] No scheduler, database, storage API, authentication, frontend, or deployment code is added.

## Completion evidence

- Seven local tests pass with `node --test website/data/importers/uic-connections-importer.test.mjs`.
- Live feed fetched successfully on 2026-10-06: 666 parsed records, 657 canonical events, 9 duplicates collapsed, and 0 skipped records. The feed response `Last-Modified` was Tue, 06 Oct 2026 02:54:11 GMT.
- Independent output checks found all API contract fields present, 657 unique source IDs, 657 unique event URLs, and no duplicate normalized title/start/location keys.
- The feed provides event-specific URLs, but serializes the `id` query separator as a quote; the importer normalizes it. Coordinates and useful organizer names are not supplied consistently, so coordinates remain null and mailto organizers are omitted.

## Non-goals

- Weekly Chicago event refresh, production scheduling, storage, or API serving.
- Editing the frontend or changing the approved B01 contract.
- Publishing unverified prices, eligibility, locations, attendees, or benefits.