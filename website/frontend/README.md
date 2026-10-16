# Kampuscape frontend

A local React + Vite prototype for the UIC social discovery map. The project name is Kampuscape.

## Run

Node 22.12+ recommended.

```sh
cd website/frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. To try it on a phone on the same Wi-Fi, run `npm run dev:phone` and open the Network https:// address it prints; it uses a local self-signed certificate (create one in `.certs/` with `openssl`), so the phone shows a one-time warning. HTTPS is needed for the native share sheet. `npm run build` creates `dist/`; `npm run preview` serves the built app. No API key is needed for this prototype.

## Content

Edit [added_sites.md](../../added_sites.md) to change a place name or description. Vite imports it directly, including in production builds: changes appear with hot reload in development and on rebuild in production. Stable IDs connect copy with metadata, bookmarks, pins, and draft plans. Names are never duplicated in metadata.

Hours, source links, coordinates, menu highlights, dietary tags, benefits, and date-bounded exhibitions are in [placeDetails.js](src/placeDetails.js). Coordinates are approximate entrance locations; Google Maps links resolve the place and address. Venue schedules are regular hours and do not guarantee holiday opening. Art Institute hours still need primary-source re-verification and show “Check schedule” instead of an open/closed claim.

Places: 88 hand-edited places within 6 miles of UIC east campus (2026-10-16 added 360 CHICAGO, the Chicago Architecture Center, Chicago History Museum, DuSable Black History Museum, Harold Washington Library Center, Buckingham Fountain and Maxwell Street Market), plus the generated nearby directory; the map opens on All places, in seven categories (Food & drink, Cafes, Nightlife, Arts & culture, Sights, Get active, Outdoors). Only documented UIC or student perks (UIC student government discount guide, UIC CADA museum admission) get the graduation-cap badge; free-for-everyone places show a Free label instead. A16 added 50 places on 2026-10-05; each has an OpenStreetMap or official source, and hours that weren't confirmed show "Check schedule". New places have no photo yet and use the illustrated fallback. The UI links to the source for every listing. Read [research notes](RESEARCH.md) before refreshing offers.

### UIC Connection live events

Live events now imports the public [UIC Connection calendar](https://uic.campusgroups.com/calendar#month). Its calendar JavaScript loads `/mobile_ws/v17/mobile_calendar.aspx` with a month date range. Verified October 5, 2026: 178 source listings; the first snapshot contained 141 not-yet-started October events and 49 public map destinations. Counts decrease as events start.

- The upcoming list includes events that have not yet ended, from the current **America/Chicago** month through the next 11 months, sorted by start time. Multi-week series already underway stay listed until they end. The app reevaluates the clock every minute and requests a new 12-month window after month rollover. Refreshed October 6, 2026: 341 source listings, 303 upcoming events through September 2027, 84 with public addresses. The larger Live events sheet has three persistent tags: UIC (CampusGroups plus UIC Gallery 400), Off-campus (independent venue exhibitions), and Community (published member events; currently empty). Private drafts remain in My Events. UIC affiliation follows the organizer, even when an outing takes place off campus.
- Each event has its organizer, Chicago date/time, official details/registration link, and a location action. Public addresses open Google Maps. Missing or private venues link to UIC Connection; sign-in may be required. No coordinates, rooms, ticket prices, or attendance are inferred.
- When the JSON feed leaves a location blank, the import fills it from UIC's official calendar file (`/ical/uic/ical_uic.ics`, parsed with Hassan's B11 importer), matched by title and start time, and then from `src/campus-event-locations.json`: places stated in a public event description, each stored with its quote. Locations UIC keeps behind sign-in stay hidden. October 6, 2026: 35 of 219 blank locations filled (27 mappable, 8 online); 184 private.
- Hover a purple building to preview its upcoming events; click or tap it to open every event there. **Pick a date** filters the UIC list to one Chicago day; only days with upcoming events can be chosen, and its arrows move from the current month to the last month with an event.
- Search in the list or Spotlight by event, host, or location. Click a mapped event card/title or its Spotlight result to fly to its venue. Official registration and Maps links remain separate; events with private/unmatched locations open their official page.
- The Vite dev and preview servers expose `/api/campus-events`, fetching the public feed with a 15-minute server cache. The client refreshes every 15 minutes and has a manual retry button. Source failures keep saved listings with a visible freshness message; expired entries still disappear.
- `public/campus-events.json` is a sanitized snapshot with source and fetch time. It contains no author identities, attendees, or ticket counts. Refresh atomically with `npm run events:refresh`; source errors leave the existing file intact.

Before a static build, run:

```sh
npm run events:refresh
npm run build
```

A static-only host serves the snapshot and shows that live refresh is unavailable. It needs scheduled snapshot refresh/rebuilds or a production endpoint equivalent to `fetchCampusEvents` in `scripts/campus-events.mjs` for continuing updates. No production service or scheduler has been deployed. This handoff is recorded as H03 in Workflow A.

Event checks: `npm test` covers parsing, month/timezone boundaries, deduplication, expiry, unsafe links, and source failures. With the dev server running, `node tests/campus-events-smoke.mjs` checks desktop/mobile, CT display in another browser timezone, search, action URLs, fallback, expiry, and unavailable states. Screenshots: `artifacts/live-events.png` and `artifacts/live-events-mobile.png`.

## Interaction scope

- Search names, descriptions, cuisine, and dietary tags; filter by category or free admission.
- Select pins or cards; view hours, benefit conditions, menus, exhibitions, and Google Maps links.
- Bookmarks and private event drafts persist in localStorage. No accounts, shared events, messages, invitations, or real attendance data are implemented.
- Reload always centers on UIC, never device location. The map supports worldwide panning and zooming.
- Drag to pan; right-drag to rotate/tilt; pinch to zoom; two-finger scrolling pans. Twist follows finger direction. Shift-horizontal scrolling controls roll. The small 2D/3D control changes pitch without hijacking scrolling. N aligns north up/east right, resets roll, and sets 3D tilt to 45° while preserving location and zoom; a flat view stays flat. The 3D toggle also uses 45°.
- Open Explore for the lower-center glass sheet; selecting a place opens its details. Both close with X. Guest dialogs use the same glass treatment.
- Saved contains only bookmarked places. My Events contains private event drafts; creating a draft opens My Events. Existing localStorage records are preserved.
- UIC labels have no dot/halo; road labels and decorative map cards are removed. The location pill has no clock.
- Building heights use map data with a 7m display fallback; these are visual estimates, not survey data.
- Day/night follows calculated Chicago sunrise/sunset, updating every minute even when the visitor is in another timezone. Solar calculations are approximate, without a weather API.
- Keyboard access, native modal focus trapping, reduced-motion handling, phone layout, and a usable list when maps fail.

## Map prototype

MapLibre GL JS 6 with OpenFreeMap vector tiles. This is a reversible frontend prototype choice; Hassan still owns production provider/budget/hosting approval. [MapLibre setup](https://maplibre.org/maplibre-gl-js/docs/) and [OpenFreeMap quick start](https://openfreemap.org/quick_start/) were checked for implementation. The worker uses Vite's `?worker&url` bundling.

`src/base-style.json` is derived from OpenFreeMap Liberty. Map attribution is retained from the tile source. [OpenFreeMap](https://openfreemap.org/), [OpenMapTiles](https://openmaptiles.org/), and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) supply the map resources. Keep attribution visible when restyling. External map/font services need internet access; text falls back to system fonts. The map bundle is relatively large and should be split/lazy-loaded before production optimization.

## Campus building colors

[UIC's official campus directory](https://maps.uic.edu/Maps) supplies 113 locations in `src/uic-buildings.json` (checked October 5, 2026). The matcher associates 112 locations with tile footprints; Flames Field Press Box has no matching footprint. Four entrance points use the nearest footprint within 35m. Matching and connected-wing affiliation are geometric estimates, not a property ownership inventory.

`node scripts/match-uic-buildings.mjs` fetches OpenFreeMap tiles and rebuilds seven attributed local vector tiles in `public/uic-tiles/`. Buildings are split before assigning UIC affiliation because original feature IDs group unrelated polygons. Campus parts are merged globally across tile boundaries; overlapping roofs become non-overlapping steps. The red material uses the original extrusion layer, not an overlay. Courtyard holes and different roof heights are retained. Elevated campus parts are simplified into ground-based stepped solids. Buildings outside the matched footprints remain neutral.

The tiles are derived from OpenStreetMap/OpenMapTiles via OpenFreeMap; retain the map attribution and the provenance in `src/uic-tile-index.json`. Geometry/source versions are recorded there; content hashes invalidate cached tiles. Refresh these curated tiles when updating campus data. Campus colors appear at building-detail zoom (14+) while the world map continues to use provider tiles.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
# With the dev server running:
node tests/smoke.mjs
```

Unit checks cover Markdown propagation, data IDs, sunrise/sunset across seasons and DST, Chicago hours, and expired exhibitions. The browser smoke flow checks loaded maps, search, details, bookmark persistence, draft creation, free filtering, and phone overflow. Screenshots are in `artifacts/`.

[Frontend tracker](../../WORKFLOW_A_BHAGYESH.md) · [Sunday refresh handoff](../../SUNDAY_REFRESH_TASK.md)


## Event building colors and navigation

`src/event-venues.json` contains source-dated addresses and coordinates from the [UIC building directory](https://maps.uic.edu/Maps) plus individually reviewed [OpenStreetMap](https://www.openstreetmap.org/copyright) venue records. It includes every public-address event in the checked snapshot (84 on October 6, 2026). Address matching normalizes street abbreviations and room/suite details; ambiguous, private, or unknown venues are never inferred from event titles or organizer names. New addresses need verification before they can highlight a building.

Live event cards and Spotlight results fly to mapped venues, close the large list, and show a compact event summary with registration and a return action. Matched off-campus upcoming-event buildings appear purple automatically, regardless of which tag is selected. UIC buildings remain red. A private event overrides either color with yellow; deleting the last private event at a building restores its normal color. Outdoor events use a location marker rather than coloring a neighboring building. The focused event closes if it drops out of the feed.

`npm run events:tiles` regenerates `public/event-tiles/` and `src/event-tile-index.json`. It starts from the existing seven campus tiles and additional OpenFreeMap tiles, matches connected roof footprints to verified venue points, and adds `event_venues` properties. Existing roof geometry and heights remain unchanged: rendering uses the original extrusion layer, without overlapping purple surfaces. See [MapLibre data-driven extrusion colors](https://maplibre.org/maplibre-style-spec/layers/#fill-extrusion-color). Thirteen tiles currently cover 120 matched venues; the pre-existing unmatched Flames Field Press Box remains uncolored. Street-edge points can use the nearest roof within 35m; these are map approximations, not room-level positions.

Rebuild event tiles after changing the venue registry or running the campus tile builder. The manifest records the campus revision, and stale event tiles are ignored when revisions differ. Original tile downloads are cached under `/tmp` for rebuilding. Retain the map's OpenStreetMap/OpenMapTiles/OpenFreeMap attribution and the source links in each venue record.

`npm test` covers address resolution, private-location exclusions, all public snapshot venues, evaluated purple/red/neutral expressions in both themes, and exact preservation of campus tile geometry. `node tests/event-map-smoke.mjs` checks rendered footprint tags, card/title navigation, camera position, registration links, off-campus and outdoor locations, phone layout, feed removal, and night restyling. Screenshots are in `artifacts/event-building*.png`.


## Private events and share links

Create event immediately activates map pinning with a yellow pin-shaped cursor. Clicking a building places a pin and turns the roof yellow before any onboarding dialog opens. Continue opens that building’s existing events or the private-event form (title, Chicago date/time, optional description, and review). Cancel/Escape removes the temporary preview without saving an event; saved events retain their highlights. There is no numbered progress strip. Known venues use annotated building tiles; custom map selections use the selected roof geometry with a stable footprint identity. Yellow uses the existing extrusion color expression, avoiding overlapping surfaces. My Events stores local records under `kampuscape-drafts`; saved places use `kampuscape-saved`. On first load after the rename, the app reads legacy Afterclass records when the Kampuscape key has no valid array, then saves them under the new key. Existing Kampuscape records, including empty lists after deletion, take precedence. Legacy keys remain available for recovery.

The lower-left glass legend explains red UIC, purple off-campus event, and yellow private-event buildings. The adjacent Chicago/event-count pills show all public events currently available in Live events, not private device records. Venue panel headings identify the selected building dynamically.

`ShareEvent.jsx` offers copy link and native sharing when supported. Links carry a size-limited, validated UTF-8 event snapshot in the URL fragment; no recipient storage or account is required to open the precise map destination. Source-withheld locations remain unlocated. Private events are not added to public listings or silently saved in the recipient’s My Events. A recipient can remove the snapshot from their map. Owners can delete their device record, but previously sent snapshots remain readable. This is not account-based access control or revocable invitation storage. A localhost link only works where that server is reachable; publish the app on a shared host for real cross-device invitations.

Run `node tests/private-events-smoke.mjs` for building-first setup, existing-event selection, actual footprint picking, local persistence/deletion, clipboard sharing, public links, fresh-recipient mobile navigation, invalid-link handling, and counter/legend layout. Unit tests cover snapshot validation, geometry identity, and yellow color precedence. Evidence is in `artifacts/private-*.png`. Backend support for synchronized/revocable events is tracked in Workflow A H04.

The share dialog uses the event name as its heading and page/native-share title, with the requested explanatory text removed. Messaging-service rich previews can still show the static site's title because URL fragments are not sent to servers and crawlers may ignore client-side titles; per-event server metadata belongs with the hosted event-ID implementation. The native sharing payload includes the event title explicitly.


## UIC accounts and recommendations

A33/B17 supersedes email-code/Google sign-in with immediate signup and email/password login for `uic.edu` accounts (no signup verification or MFA), name/optional pronouns/preset-avatar onboarding, and 1–8 interests. Sign in from the profile control, saving a place or creating an event. Public map browsing remains available. Profiles sync to Supabase; local saved places/private plans are scoped to the signed-in account. Existing guest records remain on the device.

Copy `.env.example` to `.env.local` and supply the project’s public publishable key. The project URL is already specified. Follow the [Supabase setup](../backend/supabase/README.md) to apply the migration and enable the UIC Auth hooks, immediate signup, Resend SMTP recovery and Pages welcome-email secrets. Missing configuration shows a setup message instead of simulating sign-in. The October 10 changes still require publishing; see the backend guide for exact settings.

Live events has a **For you** tab that matches the profile’s interests to current event content and explains each match. Edit interests from the profile or that tab. `npm run events:interests` retags the existing snapshot; `events:refresh` tags all refreshed events automatically. The shared `src/interests.js` catalog drives the UI, pipeline and ranking. Run `tests/onboarding-smoke.mjs` against the mock-configured dev server described in the backend guide for deterministic desktop/mobile verification.

### Building names during event creation

A24 resolves a selected roof in this order: existing venue/saved name, roof metadata, then a user-triggered OpenStreetMap Overpass lookup. Building names take priority over a complete street address. Address nodes must sit inside the roof; neighboring buildings and ambiguous results are not used. If data is missing or the request fails, the form requires a name/address entered by the user. The chosen value survives saving and snapshot sharing.

The lookup is debounced, cancellable, timed out after 12 seconds, and cached for up to 100 roofs per page session. `VITE_BUILDING_LOOKUP_URL` can replace the prototype endpoint (`https://overpass-api.de/api/interpreter`) with an Overpass-compatible service. Only roof bounds are sent, without event details. Multipolygon relation-only metadata and buildings without OSM name/address tags may require manual entry.

[Overpass usage guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) and [public-instance guidance](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances) checked 2026-10-07. The public endpoint is a small-prototype dependency, not a production provider commitment: production needs an appropriate service or cached proxy with application-wide rate limits (H05 in Workflow A). Public service availability is not guaranteed.

Regression check: with Vite running, `node tests/building-details-smoke.mjs` exercises synthetic named/address-only responses, saved event values, offline fallback and manual entry. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome.

### Returning from registration

A29 tracks event details/registration link activation, then waits for the page to lose focus/be hidden and return before asking “Did you register?”. Confirmation saves a sanitized snapshot to `kampuscape-registered-events` (with an account ID suffix for signed-in users) and opens My Events; dismissal saves nothing. Events already in that list do not prompt again. Saved public events are separate from private drafts and never turn buildings yellow. No registration status is verified with the organizer.

Pending return state uses tab-scoped session storage (`kampuscape-registration-return`, also account-scoped), survives reload and expires after 24 hours. Saved events remain local until removed; account-specific saves and pending reminders clear on account deletion. Switching accounts remounts the registration state. Browser focus/visibility signals indicate return to the app, not completion on another website; browser tab suspension and disabled storage can limit recovery. Account-backed sync remains Workflow A H06.

With Vite running: `PLAYWRIGHT_CHANNEL=chrome node tests/registration-return-smoke.mjs`. The test stubs external registration pages and simulates lifecycle signals in headless Chrome; it never submits a registration. It checks the Fall Fest detail link, UIC card links, add/dismiss, persistence, duplicates, removal, mobile bounds and pending-return recovery after reload.

### Visit guide, recommendations, sharing, and messaging

First visits show eight clickable guide cards; **How it works** reopens the guide. Members get up to four current Live-events recommendations on each page visit, ranked by interests and timing. A shared-event deep link takes priority over the recommendations popup. **What’s happening** reopens recommendations.

Private-event **Share** now creates an unlisted server-rendered page with host/event/date/time metadata and a PNG thumbnail. **Who’s going → Message** sends a request; recipients accept or decline before chatting and can block across all events. Messages are available from the top-right control.

Public event data preloads and survives temporary network failures. Account data caches are separated and cleared at sign-out; hidden/offline tabs pause polling. The optional scheduled Worker refreshes the public feed while nobody is browsing. See [backend setup and behavior](../backend/SOCIAL_FEATURES.md) for required migrations, Pages variables, privacy/lifecycle details, and the optional KV/cron deployment.

Run `node tests/social-smoke.mjs` against the mock-configured port 5174 server described in the backend README for synthetic desktop/mobile two-user checks.
