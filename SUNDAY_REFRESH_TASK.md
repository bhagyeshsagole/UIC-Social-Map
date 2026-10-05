# Sunday place refresh

- [ ] **B10 · Implement weekly official-source content refresh.** Owner: Hassan. Status: TODO, not scheduled. The user requested a task for later backend work; this UI change creates no backend jobs.

Run every Sunday at 09:00 America/Chicago (proposed time; Sunday cadence is requested). Use a timezone-aware scheduler so daylight-saving changes preserve the local time. If the hosting scheduler only supports UTC, run daily and gate against Chicago's Sunday/date, with an idempotent weekly run key.

## Work to implement

1. Read the stable place IDs and source registry. Fetch the Art Institute [exhibition API](https://api.artic.edu/docs/), Gallery 400's exhibition/events pages, venue hours, menus, benefit sources, and run-club announcements. Honor rate limits and source terms.
2. Extract dated exhibitions, shows, cancellations, regular/holiday hours, menu changes, and student eligibility conditions. Store source URL, fetched timestamp, content hash, and field-level evidence.
3. Validate dates and America/Chicago times. Reject malformed records, expired offers, and undated claims. Keep paid workshops separate from free museum admission. Never infer vegan or halal status from the restaurant's cuisine.
4. Upsert external events by source ID. Mark expired exhibitions inactive even if fetching fails. Preserve last-known factual content with a stale timestamp on network errors; don't erase it or call it freshly verified.
5. Produce review to-dos for changed prices, unclear eligibility, moved meet points, missing primary evidence, or failed fetches. Recheck Art Institute hours, Cairo Kebab menu examples, and the dated URL for the 3RUN2 schedule first.
6. Preserve manually edited names/descriptions in `added_sites.md`. Automated imports update metadata; proposed copy edits must be explicit review items. UI adapters must continue joining by stable ID.
7. Log job status and retry transient failures with bounded backoff. Provide an authenticated manual-run option and an audit trail. Do not send notifications or overwrite published copy silently.

## Acceptance checks

- [ ] A Sunday dry run produces source-backed changes and actionable review tasks.
- [ ] Running twice creates no duplicate records or tasks.
- [ ] Both Chicago daylight-saving transitions preserve the intended Sunday cadence.
- [ ] Expired events disappear; failed sources remain visibly stale.
- [ ] User-edited Markdown copy survives an import.
- [ ] No prices, attendees, discounts, or dietary labels are invented.
- [ ] The team agrees on the metadata/API contract and hosting scheduler before activation.

Frontend handoff: [placeDetails.js](website/frontend/src/placeDetails.js) is the current local prototype shape; it is not an agreed production contract. [Research notes](website/frontend/RESEARCH.md) describe evidence gaps.
