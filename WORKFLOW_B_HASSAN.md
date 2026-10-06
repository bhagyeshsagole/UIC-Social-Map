# Workflow B · Hassan

> [!info] Ownership
> **Backend, maps/provider selection, event data, and deployment.** Edit `website/backend/**`, `website/data/**`, `website/contracts/**`, `website/deployment/**`, and this tracker.

> [!important] Claude Code: update BOTH workflows on every request
> This applies to every request, small or large, whether Bhagesh or Hassan asks.
> 1. **Before starting**, read [Workflow A](WORKFLOW_A_BHAGYESH.md) and [Workflow B](WORKFLOW_B_HASSAN.md). Check the other person's *Current work* and *Active claims* for the same task, files, or folders. If the work overlaps, stop and ask (or record a handoff) before editing anything.
> 2. **Claim the work** before editing: set the task to `IN PROGRESS` under *Current work* in the owner's workflow, and add the same row to *Active claims* in **both** files (who, task ID, paths being touched, date).
> 3. **When finished**, update both files again: the owner's workflow gets status, evidence, checkbox, and a dated change-log entry; remove the claim from *Active claims* in both files, and add a one-line change-log entry to the other workflow saying what changed.
> 4. If it's unclear whose workflow a request belongs to, use the one that owns the paths being touched and ask if still unclear. Never edit the other person's folders without an agreed handoff or an explicit request.

**Updated:** 2026-10-06<br>
**Current task:** B01 data/API contract approved; B11 UIC Connections local importer complete; B02 provider review and B10 weekly Chicago place-content refresh pending<br>
**Implementation progress:** 1 / 9 tasks complete

## Steps and tracker

- [x] **B00 · Workspace ready.** Backend, data, contracts, deployment folders, and this tracker created. Documentation only.
- [x] **B01 · Agree on the data/API contract.** Draft place, event, meetup, attendance, identity, and chat response shapes; review with Bhagesh and publish synthetic fixtures. Keep unresolved policy fields explicit. **DONE; contract approved by Bhagesh on 2026-10-06.**
- [ ] **B02 · Choose the map provider.** Compare SDK fit, coverage, pricing, quotas, and content-use terms; document the choice, browser-key restrictions, and setup details for Bhagesh. **Ready now.**
- [ ] **B03 · Set up backend and storage.** Select backend/database/hosting within an agreed budget; keep dependencies separate from frontend. Implement initial schema after B01. **Evaluation ready now.**
- [ ] **B04 · Add the first real places and events.** Define seed format; record sources, coordinates, times/time zones, benefit conditions, and last-checked dates. Build a repeatable import/update path. **After B01; initial source collection can begin now.**
- [ ] **B05 · Build membership and discovery APIs.** Implement agreed email verification/access rules, sessions, and place/event/meetup retrieval. Test authorization server-side. **Needs B03 + EV01 decision.**
- [ ] **B06 · Build participation and messaging.** Join/leave, attendance counts, named/pseudonymous display, chat permissions, blocks, and reports. Keep internal identity links restricted. **Needs B05 + EV02–EV07 decisions.**
- [ ] **B07 · Verify backend behavior.** Test unauthorized access, duplicate joins, block evasion across nicknames, cancelled events, and data deletion/retention rules. Document contract changes and integration handoff. **Needs B05–B06.**
- [ ] **B08 · Set up preview deployment.** Configure builds, secrets, database changes, auth callbacks, permitted origins, quotas, and logs. Record exact setup and rollback steps. **Needs B02–B03 and runnable frontend/backend.**
- [ ] **B09 · Prepare pilot release.** Confirm verified listings, agreed moderation owner, working preview, and A07/B07 evidence. Record launch decision with Bhagesh before public release. **Needs shared pilot-scope decision.**

Check a task only when its result exists. These tasks do not imply approval of a paid service or public launch.

- [ ] **B10 · Weekly Chicago place-content refresh.** [Task and acceptance criteria](SUNDAY_REFRESH_TASK.md). Pull official-source place hours, benefits, and related Chicago content; preserve editable names and descriptions. No job scheduled.
- [x] **B11 · Import UIC Connections events locally.** [Task and acceptance criteria](website/data/importers/UIC_CONNECTIONS_IMPORTER_TASK.md). Seven tests pass; the 2026-10-06 live import produced 657 canonical events from 666 feed records, collapsing 9 duplicates. Manual monthly refresh only; no production scheduler or storage integration.

## Current work

| Task | State | Evidence / blocker |
| --- | --- | --- |
| A17 | DONE | Building-first setup with existing-event choice, map pins/yellow roofs/deletion, snapshot sharing, glass legend, total-events pill, venue headings and event-name share titles. 42 unit tests, build, private-events, event-map, campus-events and main browser checks pass; shared backend/hosting remains H04 |
| A15 | DONE | Public event cards fly to matched venues; upcoming-event buildings turn purple ahead of UIC red. 33 unit tests, production build, event-list and map browser checks pass |
| A14 | DONE | Prepared validated A12/A13 and existing map refinements for user-requested Git publication to origin/main; remote has no new commits |
| A13 | DONE | Larger desktop/mobile event sheet; persistent UIC, Off-campus, Community tags; production build and event browser checks pass |
| A12 | DONE | Upcoming UIC Connection events integrated in local frontend; 28 unit tests, production build, desktop/mobile event browser checks, and real local API verification pass. Production refresh deployment remains H03 |
| B00 | DONE | [Website workspace](website/README.md) |
| B01 | DONE | Proposed contract and synthetic fixtures approved by Bhagesh on 2026-10-06; unresolved product policies remain explicitly identified |
| B02 | TODO | A08 frontend has a reversible MapLibre 6 + OpenFreeMap prototype; production provider still requires Hassan review (H01) |
| B04 | PARTIAL | Seven researched places in frontend metadata; sources and gaps in [research](website/frontend/RESEARCH.md). Backend import not implemented |
| B10 | TODO | [Sunday refresh task](SUNDAY_REFRESH_TASK.md), incoming H02 from Workflow A |
| B11 | DONE | [Importer task and verification evidence](website/data/importers/UIC_CONNECTIONS_IMPORTER_TASK.md); 657 canonical events in local output |

## Active claims

Mirrored in both workflow files. Add a row when work starts; remove it when the work is done.

| Who | Task | Paths being touched | Since |
| --- | --- | --- | --- |

## Handoffs and messages to Bhagesh

Write requests here; Bhagesh responds in [his tracker](WORKFLOW_A_BHAGYESH.md#handoffs-and-messages-to-hassan). Reference the same ID in both files.

| ID | Date | Request / deliverable | State |
| --- | --- | --- | --- |
| B01 | 2026-10-06 | Review the proposed place/event/meetup/user/session contract and synthetic fixtures; agree before backend implementation. | Approved / completed by Bhagesh |

Provider handoff should include the SDK, supported version, configuration variable names, cost limits, and any attribution requirements. Never put actual credentials here.

## Change log

- **2026-10-06:** Completed B01 after Bhagesh approved the versioned API/data contract and synthetic fixtures. Removed the mirrored B01 active claim; unresolved product-policy choices remain documented. No backend implementation started.
- **2026-10-06:** Completed B11 local UIC Connections ICS import. Seven tests pass; live feed produced 657 canonical events from 666 records with 9 duplicates collapsed and none skipped. Monthly cadence is agreed, but scheduling remains deferred until storage integration. B10 is explicitly the weekly Chicago place-content refresh. No frontend or backend storage changes.
- **2026-10-06:** Claimed B11 for a local, dependency-light UIC Connections ICS importer. The task is limited to parsing, normalization, duplicate prevention, local JSON output, tests, and live-feed verification; no scheduler, database, storage, or frontend integration is included.
- **2026-10-06:** Drafted the B01 API/data contract and synthetic fixtures; B01 remains in progress awaiting Bhagesh review and agreement. No backend, database, authentication, deployment, or frontend implementation started.
- **2026-10-04:** Created the backend workflow and file boundaries. No provider, backend, database, or deployment configured.
- **2026-10-04:** Added the rule that every Claude Code request updates both workflow files, plus a mirrored *Active claims* table, so work doesn't overlap. Requested by Bhagesh; same change made in [Workflow A](WORKFLOW_A_BHAGYESH.md).

- **2026-10-04:** Bhagesh frontend A08 prototype completed with seven researched listings, Markdown-driven copy, local saved plans, and day/night 3D map. See Workflow A H01–H02 for provider review and B10 Sunday-refresh handoffs. Backend, contracts, data, and deployment implementation folders were not changed.
- **2026-10-05:** Bhagesh frontend A10: place photos, larger detail type, hours/calendar in the detail footer, ⌘K spotlight search, Explore recenter, collapsed map attribution. Frontend-only; `placeDetails.js` gained a `photo` field (file, alt, credit, href) that the B10 refresh should preserve. Six venue photos still need permission or replacement before launch.
- **2026-10-05:** A10 follow-up: removed the keyboard-hint footer (↑↓ / ↵ / ⌘K) from the spotlight search. Frontend only.
- **2026-10-05:** A10 follow-up: swapped in more representative photos (Art Institute façade and lion, CC BY-SA 4.0 by Nicholas Hartmann; Gallery 400 gallery interior; First Ascent climber; 3RUN2 runners; Cairo Kebab grill platter). Detail footer is now an even three-column grid. The hours card shows today's hours and opens a Monday–Sunday list on click. Added a weekly schedule for the Art Institute (taken from its existing hours text) and weekly labels for 3RUN2. Frontend only; unit tests, build, and smoke test pass.

- **2026-10-05:** A09 frontend refinements complete; 14 unit tests, production build and browser flow passed with no page errors. World navigation replaces Chicago bounds. Campus colors use seven locally rebuilt, attributed OpenFreeMap tiles with cross-tile geometry cleanup; preserve `public/uic-tiles/` and `src/uic-tile-index.json` together. Saved and My Events are separate local-only views. No backend changes.
- **2026-10-05:** Bhagesh frontend A11: 31 places within 4 miles of UIC (was 7), a new `diet` and `student` field in `website/frontend/src/placeDetails.js`, a new `weekly` field for non-range hours, and new Markdown entries in `added_sites.md`. B10 Sunday refresh should preserve these fields and re-check the USG guide; two USG-listed places have closed.
- **2026-10-05:** A11 follow-up: always-free places (kind `free`) now also show the student badge on map pins, through `hasPerk` in `Map.jsx`. The data is unchanged. Frontend only.

- **2026-10-05:** A11 frontend label fixes complete: UIC moved to courtyard, all place pins retained, active name boxes avoid collisions and screen edges. 20 unit tests, build and browser verification passed. Project snapshot prepared for user-requested Git push; no backend changes.
- **2026-10-05:** Frontend map gesture fix: Option/Alt + two-finger scroll rotates the map. Chrome on macOS doesn't expose trackpad rotation; Safari's gesture events and touchscreen twist still rotate directly.
- **2026-10-05:** Gesture follow-up: a sideways two-finger trackpad swipe now rotates the map in Chrome with no modifier key. Vertical swipes pan, Option/Alt + swipe pans freely, and Shift + swipe still rolls. Smoke test updated.
- **2026-10-05:** Gesture revert: two-finger swipe pans again. Twist-to-rotate works through Safari gesture events and touchscreens; Chrome on macOS doesn't expose trackpad rotation, so Option/Alt + swipe rotates there.
- **2026-10-05:** Added a red glass "UIC" map button between N and the 2D/3D toggle that flies back to the main-campus starting view. Frontend only.
- **2026-10-05:** The UIC button now returns to campus flat (pitch 0, no roll) and keeps the current rotation.
- **2026-10-05:** Correction: the UIC button now returns to campus in 3D (pitch 54) facing north (bearing 0, no roll).

- **2026-10-05:** A12 frontend imports verified UIC Connection events with upcoming current-month filtering, official registration/location actions, search, and local dev/preview refresh. Initial snapshot: 141 events, 49 public map destinations; live verification later returned 139. 28 unit tests, build, and desktop/mobile browser checks pass. Workflow A H03 hands off production endpoint or scheduled snapshot refresh; no backend/data/deployment folders or deployed services changed.

- **2026-10-05:** A13 frontend complete: enlarged Live events with UIC, Off-campus, and Community tags, roomier event cards, and verified desktop/mobile behavior. Community remains empty until shared publishing exists; private drafts remain private. Build and event browser checks pass; no backend changes.

- **2026-10-05:** User requested Git publication of the current project. Prepared the live-events importer, larger category-based event browser, existing map refinements, screenshots, and documentation for `origin/main`. Prior validation: 28 unit tests, production build, and desktop/mobile event browser checks passed; whitespace check clean and remote unchanged before commit.

- **2026-10-05:** A15 frontend now maps public event addresses to buildings, colors all upcoming-event venues purple, and navigates there from event cards/search. 33 unit tests, production build, and desktop/mobile event-list/map checks pass. Preserve `src/event-venues.json`, `src/event-tile-index.json`, and `public/event-tiles/`; run `npm run events:tiles` after changing venue coordinates or campus tiles. New unmatched addresses keep official links until verified. Backend/deployment unchanged.
- **2026-10-05:** Bhagesh frontend A16: building hover previews, per-building event sheet, and a date picker in Live events. Frontend only; no feed, contract or data changes.
- **2026-10-05:** Bhagesh A18: Apple design audit of the frontend recorded in [Workflow A](WORKFLOW_A_BHAGYESH.md#apple-design-audit-a18); `Skills/emil-kowalski-skills/` added (MIT). Documentation only; no backend, data or contract impact.

- **2026-10-05:** A17 frontend complete: building-first private creation/existing-event selection, yellow roofs/local deletion, snapshot share links, glass legend, total-event pill, dynamic venue headings and simplified event-name sharing. 42 unit tests, build and four browser flows pass; A16 behavior preserved. H04 in Workflow A records shared storage/auth/revocation/hosting dependencies. Backend and deployment unchanged.

- **2026-10-05:** A17 correction: Create event now starts directly in map pin mode with a yellow SVG pin cursor. Clicking a roof immediately previews it in yellow and places a pin; Continue opens onboarding/existing-event choices. Cancel/Escape clears the unsaved preview, preserving saved highlights. Shared campus roofs resolve to the nearest named venue. Production build, 42 unit tests, and updated desktop/mobile private-event browser checks pass, including computed pin cursor, no initial dialog, yellow preview before setup, saving/sharing/deletion, and cancellation with no stored event. Evidence: `website/frontend/artifacts/private-pin-preview.png`. No backend/deployment changes.
- **2026-10-05:** A17 follow-up: compact pin-mode banner. Frontend only.
- **2026-10-05:** A17 follow-up: compact share dialog. Frontend only.
- **2026-10-05:** Bhagesh A19: 50 new places in `added_sites.md` and `website/frontend/src/placeDetails.js` (new `Nightlife` and `Sights` categories, optional `photo`, places up to 6 miles out) plus October 2026 venue events. B10 Sunday refresh should re-check hours labeled "from OpenStreetMap" and the USG guide, which still lists two closed restaurants (Ichiban Sushi Cafe, Taylor Made Pizza).
- **2026-10-05:** A19 follow-up: detail sheet without photo placeholder; five off-campus venues added to `website/frontend/src/event-venues.json` and event tiles rebuilt so their buildings turn purple. Frontend only.
- **2026-10-05:** A19 follow-up: all off-campus place buildings purple (71 venues added to `event-venues.json`, event tiles rebuilt) and page load matches the UIC button view. Frontend only.
- **2026-10-05:** A19 follow-up: corrected First Ascent's building match (Block 37). Frontend only.
- **2026-10-06:** A19 follow-ups: all-events sheet from place details, photos for the 50 new places (49 Commons, Metro's own photo needs permission before launch), Live events date picker in the category row for every tab, refresh button removed. Frontend only.
- **2026-10-06:** Bhagesh A20: phone layout rework, map credits moved to the profile dialog, native share sheet. Frontend only. Deployment note: native sharing needs the site served over HTTPS.
- **2026-10-06:** A20 follow-ups: iPhone Safari edge-to-edge scroll runway, sheets hide the phone nav, `npm run dev:phone` (HTTPS, self-signed cert in gitignored `.certs/`). Deployment: serve over HTTPS for native sharing.

- **2026-10-06:** A21: drafted Student Venture Showcase/Founder Panel answers in chat with `Skills/humanizer/SKILL.md`. Used Afterclass as the existing working name and October 2026 as the documented prototype start; kept social handles as a fill-in and did not claim a public launch, users, revenue, or completed backend. No application submitted or product files changed.
- **2026-10-06:** Bhagesh A22: Live events now shows 12 months of UIC Connection events (303, through Sep 2027) from the frontend's CampusGroups JSON request, not B11's output, because the JSON feed includes venue addresses. B11 is unchanged and still not consumed by the frontend; the team still needs to pick one UIC event source for storage. `website/data/output/` is left uncommitted. Five venues added to `website/frontend/src/event-venues.json`.
