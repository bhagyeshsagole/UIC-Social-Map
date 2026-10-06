# UIC Connections local importer

The importer is a local Node.js data-quality utility. It does not start a server or schedule work.

```sh
node website/data/importers/uic-connections-importer.mjs
node --test website/data/importers/uic-connections-importer.test.mjs
```

The command fetches the official CampusGroups feed, writes `website/data/output/uic-events.json`, and reports canonical event and duplicate counts. The output is intentionally local and is not consumed by the frontend yet. It replaces the output file on each run, so it does not accumulate copies from previous runs.

The parser supports folded ICS lines, escaped text, quoted-printable text, UTC timestamps, `TZID` values, and missing optional fields. It preserves the source UID and event-specific URL for later reconciliation. CampusGroups currently encodes RSVP URLs with a quote in place of the `=` after `id`; the importer normalizes that to a valid URL. When no event-specific URL is available, it uses the feed URL.

Duplicate detection groups records by source UID first, event URL second, and normalized title/start/location last. The newest `LAST-MODIFIED`/`CREATED` record wins within a group. A duplicate report records each collapsed record. Output timestamps include source `CREATED`/`LAST-MODIFIED` when available and the local import timestamp otherwise.

UIC Connections refresh is agreed to be monthly. This command remains a manual local import; do not schedule it until Bhagesh completes storage integration and the team agrees where imported events are saved. The separate B10 Sunday refresh is for Chicago place content, not the UIC Connections calendar.

Run the tests before changing parser behavior. Keep output fixtures synthetic and never add personal event registration data.
