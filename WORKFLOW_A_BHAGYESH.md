# Workflow A · Bhagesh

> [!info] Ownership
> **Frontend, UI, and visual experience.** Edit `website/frontend/**` and this tracker. Hassan selects the map provider; Bhagesh installs its frontend dependency and builds the map experience.

> [!important] Claude Code: update BOTH workflows on every request
> This applies to every request, small or large, whether Bhagesh or Hassan asks.
> 1. **Before starting**, read [Workflow A](WORKFLOW_A_BHAGYESH.md) and [Workflow B](WORKFLOW_B_HASSAN.md). Check the other person's *Current work* and *Active claims* for the same task, files, or folders. If the work overlaps, stop and ask (or record a handoff) before editing anything.
> 2. **Claim the work** before editing: set the task to `IN PROGRESS` under *Current work* in the owner's workflow, and add the same row to *Active claims* in **both** files (who, task ID, paths being touched, date).
> 3. **When finished**, update both files again: the owner's workflow gets status, evidence, checkbox, and a dated change-log entry; remove the claim from *Active claims* in both files, and add a one-line change-log entry to the other workflow saying what changed.
> 4. If it's unclear whose workflow a request belongs to, use the one that owns the paths being touched and ask if still unclear. Never edit the other person's folders without an agreed handoff or an explicit request.

**Updated:** 2026-10-05<br>
**Current task:** A13 complete; larger Live events sheet and category tags<br>
**Implementation progress:** A02 and A08 complete; remaining production journey tasks pending

## Steps and tracker

- [x] **A00 · Workspace ready.** Frontend folder, ownership, and this tracker created. Documentation only.
- [ ] **A01 · Design the main journey.** Sketch discovery → place/event detail → join → conversation. Include map and list browsing. **Ready now.**
- [x] **A02 · Build the visual foundation.** Choose frontend stack; set up its own dependencies, reusable components, mobile layouts, loading/empty/error states. **After A01.**
- [ ] **A03 · Build discovery with sample data.** Map/list shell, filters, place details, event times, benefits, and meetup details. Label fixtures synthetic. **After A02 + B01 contract agreement.**
- [ ] **A04 · Build participation screens.** Email verification UI, name/nickname choice, join/leave, chat, report/block controls. Start with prototypes; final behavior follows EV01–EV07 decisions. **After A02; production behavior waits on decisions.**
- [ ] **A05 · Connect the real map.** Install the selected SDK inside frontend; render pins, selection, bounds, and list fallback. **Needs B02 provider handoff.**
- [ ] **A06 · Integrate backend features.** Replace mocks with agreed API/auth/chat flows; handle permission errors, expired sessions, full/cancelled meetups. **Needs B05–B07.**
- [ ] **A07 · Verify the student experience.** Test mobile navigation, keyboard use, join/leave counts, nickname display, chat, and failure states against preview. Record issues/evidence here. **Needs A05–A06 + B08 preview.**

Check a task only when its result exists. If a task is partial, leave it unchecked and describe progress below.

- [x] **A10 · Detail and search polish.** Place photos with credits, larger type, hours and calendar beside the detail actions, ⌘K spotlight across places, saved, events, plans, menus, and activities. Explore recenters on UIC; map attribution stays collapsed until toggled.
- [x] **A11 · More student places.** 31 sourced places within 4 miles of UIC, diet facts for every food place, student-perk pin badges, hover-only pin names.
- [x] **A08 · First map UI from supplied references.** UIC-centered bounded 3D discovery, glass navigation, automatic solar themes, source-backed places, editable Markdown names/descriptions, local bookmarks and event drafts.

- [x] **A09 · Map and UI refinements.** World navigation/UIC reload, viewport containment, glass sheets and guest dialog, corrected pan/twist/roll, 2D/3D and north-up alignment, red UIC geometry, Saved/My Events separation.

- [x] **A11 · Campus label and place name boxes.** UIC moved to the Lecture Center courtyard; active tooltips avoid neighboring icons without hiding any place pins.

- [x] **A12 · UIC Connection live events.** Public calendar importer, current-month future-start filtering in Chicago time, official registration/location actions, list/Spotlight search, refresh and cached fallback.

- [x] **A13 · Event browsing space and categories.** Larger event sheet, roomier cards, and UIC / Off-campus / Community tags with separate results.

## Current work

| Task | State | Evidence / blocker |
| --- | --- | --- |
| A14 | DONE | Prepared validated A12/A13 and existing map refinements for user-requested Git publication to origin/main; remote has no new commits |
| A13 | DONE | Larger desktop/mobile event sheet; persistent UIC, Off-campus, Community tags; production build and event browser checks pass |
| A12 | DONE | Upcoming UIC Connection events integrated in local frontend; 28 unit tests, production build, desktop/mobile event browser checks, and real local API verification pass. Production refresh deployment remains H03 |
| A11 | DONE | UIC courtyard label; every place pin retained, one collision-aware name box. 20 unit tests, production build and targeted browser checks passed |
| A10 | DONE | [Detail with photo](website/frontend/artifacts/detail-photo.png), [spotlight](website/frontend/artifacts/spotlight.png); 8 unit tests, production build, and browser smoke flow pass with no page errors |
| A09 | DONE | 14 unit tests, production build, and browser checks pass; [campus seams](website/frontend/artifacts/campus-close.png), [rotated map](website/frontend/artifacts/campus-rotated.png), [guest glass](website/frontend/artifacts/guest.png) |
| A00 | DONE | [Frontend workspace](website/frontend/README.md) |
| A01 | PARTIAL | Discovery and detail implemented; participation/conversation remain pending |
| A02 | DONE | React/Vite frontend, responsive styles, native dialog, loading/error/empty states |
| A08 | DONE | [App setup](website/frontend/README.md), [desktop](website/frontend/artifacts/desktop.png), [phone](website/frontend/artifacts/mobile.png), [day](website/frontend/artifacts/day.png); production build and five unit tests pass; browser flow passed without page errors |

## Active claims

Mirrored in both workflow files. Add a row when work starts; remove it when the work is done.

| Who | Task | Paths being touched | Since |
| --- | --- | --- | --- |

## Handoffs and messages to Hassan

Write requests here; Hassan responds in [his tracker](WORKFLOW_B_HASSAN.md#handoffs-and-messages-to-bhagesh). Reference the same ID in both files.

| ID | Date | Request / deliverable | State |
| --- | --- | --- | --- |
| H01 | 2026-10-04 | A08 uses MapLibre 6 + OpenFreeMap for a local prototype. Hassan to review production provider, bounds/coverage, and quotas in B02. Metadata in `website/frontend/src/placeDetails.js` is provisional. | Awaiting Hassan |
| H02 | 2026-10-04 | Implement [B10 Sunday refresh](SUNDAY_REFRESH_TASK.md); preserve user-edited Markdown copy and produce source-backed review tasks. | TODO |
| H03 | 2026-10-05 | A12 provides `website/frontend/scripts/campus-events.mjs` and a sanitized public snapshot. Local dev/preview refresh via a cached same-origin API. Reuse the importer for production API/scheduled builds when hosting is selected; static-only deploys show snapshot freshness and cannot refresh the upstream feed themselves. | Local implementation complete; production deployment pending Hassan |

For each handoff include: task ID, relevant path, required behavior, and what is blocked. Link screenshots/design files here when they exist.

## Change log

- **2026-10-04:** Created the frontend workflow and file boundaries. No UI or application code implemented.
- **2026-10-04:** Added the rule that every Claude Code request updates both workflow files, plus a mirrored *Active claims* table, so work doesn't overlap. Same change made in [Workflow B](WORKFLOW_B_HASSAN.md).

- **2026-10-04:** Completed A08 first UI and A02 foundation. Seven sourced places, menu highlights/tags, external maps links, dated exhibitions, solar themes, local saves/drafts, and Humanizer skill. Five unit tests, production build, and desktop/mobile/day browser checks passed. Accounts, publishing, chat, backend refresh, and production deployment remain unimplemented. Mirrored completion in Workflow B.
- **2026-10-05:** Completed A10. Added photos for all seven places in `website/frontend/public/places/`: the Art Institute photo is from Wikimedia Commons (CC BY 2.0, credited); the other six come from each venue's own website and are credited and linked. **Before any public launch, get permission for the six venue photos or replace them with licensed ones.** Enlarged text in the detail and list views. Hours and current calendar listings now sit beside Google Maps / Make a plan. The magnifier opens a ⌘K spotlight search over places, saved places, events, drafts, menu items, and activities, while Explore keeps the list and filters and now flies back to UIC. Map attribution starts collapsed. Tests: 8 unit tests, production build, and `tests/smoke.mjs` all pass. Mirrored in Workflow B.
- **2026-10-05:** A10 follow-up: removed the keyboard-hint footer (↑↓ / ↵ / ⌘K) from the spotlight search. Frontend only.
- **2026-10-05:** A10 follow-up: swapped in more representative photos (Art Institute façade and lion, CC BY-SA 4.0 by Nicholas Hartmann; Gallery 400 gallery interior; First Ascent climber; 3RUN2 runners; Cairo Kebab grill platter). Detail footer is now an even three-column grid. The hours card shows today's hours and opens a Monday–Sunday list on click. Added a weekly schedule for the Art Institute (taken from its existing hours text) and weekly labels for 3RUN2. Frontend only; unit tests, build, and smoke test pass.

- **2026-10-05:** Completed A09. Removed branding, time/live dots, road labels, welcome copy/reminder and decorative controls; resized header, moved discovery to a closable bottom-center glass sheet, styled Guest glass and aligned its close controls. UIC label is text-only. World navigation starts at UIC; two-finger scrolling pans, twist direction is corrected, roll is supported, and 2D/3D is explicit. N aligns north-up at 45° in 3D with zero roll. Saved shows bookmarks only; My Events shows local drafts. Nav order: Explore, Live events, My Events, Saved, Create event, Search. UIC colors now use a single extrusion layer with globally merged, stepped campus geometry across tile boundaries, removing overlay flicker and split-building seams. 112/113 official directory locations matched; Flames Field Press Box has no footprint. Four point-to-footprint matches are approximate; see frontend README. 14 unit tests, production build and full browser smoke checks passed with no page errors; close/rotated screenshots visually checked. Backend integration, publishing and production optimization remain pending.
- **2026-10-05:** A11 places expansion (Claude Code for Bhagesh). Grew the map from 7 to 31 places, all within 4 miles of UIC east campus (a unit test enforces this). Sources: UIC USG student discount guide (food perks), CADA museum-admission page (museums), Recreation & Wellbeing (gyms), and each venue's own site; dated 2026-10-05. Taylor Made Pizza and Ichiban Sushi Café are still in the USG guide but are listed as closed, so they were left out. Added chains without student perks (Papa John's, Taco Bell, Portillo's, Starbucks UV, Subway UV); Chipotle gets the badge through USG's Chipotle U listing. New rule: every Food & drink / Cafes place states five diet facts (non-veg, vegetarian, vegan, gluten-free, halal) as yes / options / none / ask staff, sourced from menus. The diet filter and spotlight use them. Student-perk places carry `student:true` and show a graduation-cap badge on their map pin; pin names now appear only on hover, focus, or selection. Opening status now handles hours past midnight. Hours conflict or are unpublished for Primo's, Taco Bell, Starbucks UV, and Subway UV, so they say to check. Some hours come from Yelp and say so. 15 venue-site photos and 16 Wikimedia Commons photos are credited; venue-site photos need permission before launch. Tests: 18 unit, build, smoke pass.
- **2026-10-05:** A11 follow-up: always-free places (kind `free`) now also show the student badge on map pins, through `hasPerk` in `Map.jsx`. The data is unchanged. Frontend only.

- **2026-10-05:** Completed A11: moved UIC label to the central Lecture Center courtyard. Retained all 31 place pins, made only one hovered/focused/selected name box active, and positioned the box to avoid nearby pins and viewport clipping. Verified label placement, hover, selection and mobile; 20 unit tests and production build pass. Corrected workflow links to the existing renamed file. User requested committing and pushing the accumulated project snapshot.
- **2026-10-05:** Frontend map gesture fix: Option/Alt + two-finger scroll rotates the map. Chrome on macOS doesn't expose trackpad rotation; Safari's gesture events and touchscreen twist still rotate directly.
- **2026-10-05:** Gesture follow-up: a sideways two-finger trackpad swipe now rotates the map in Chrome with no modifier key. Vertical swipes pan, Option/Alt + swipe pans freely, and Shift + swipe still rolls. Smoke test updated.
- **2026-10-05:** Gesture revert: two-finger swipe pans again. Twist-to-rotate works through Safari gesture events and touchscreens; Chrome on macOS doesn't expose trackpad rotation, so Option/Alt + swipe rotates there.
- **2026-10-05:** Added a red glass "UIC" map button between N and the 2D/3D toggle that flies back to the main-campus starting view. Frontend only.
- **2026-10-05:** The UIC button now returns to campus flat (pitch 0, no roll) and keeps the current rotation.
- **2026-10-05:** Correction: the UIC button now returns to campus in 3D (pitch 54) facing north (bearing 0, no roll).

- **2026-10-05:** Completed A12 per the user’s CampusGroups request. Verified public calendar/data endpoint; imported 141 upcoming October events from 178 source records at first fetch (49 public map destinations). Live endpoint returned 139 later as start times passed. Private/unpublished locations link to official details without guessing. Added Chicago month/start-time filtering, 15-minute local refresh, manual retry, dated fallback, event/host/location search, and registration links. 28 unit tests, production build, real API request, and desktop/mobile browser checks pass without page errors; screenshots in `website/frontend/artifacts/live-events*.png`. H03 records production refresh dependency. Preserved existing unrelated uncommitted map/gesture changes.

- **2026-10-05:** Completed A13. Live events grows from 820×460px to up to 1120×740px on desktop and fills the available phone height. Category tags remain visible while cards scroll. UIC includes the CampusGroups feed and Gallery 400; Off-campus contains independent venue listings; Community shows an honest empty state and links to My Events without exposing private drafts. Larger card text, spacing, and location/actions improve scanning. Production build and updated browser checks pass, including category switching, affiliation separation, panel bounds, mobile overflow, links, fallback, and expiry. Updated live-event screenshots. Community publishing still depends on account/backend work.

- **2026-10-05:** User requested Git publication of the current project. Prepared the live-events importer, larger category-based event browser, existing map refinements, screenshots, and documentation for `origin/main`. Prior validation: 28 unit tests, production build, and desktop/mobile event browser checks passed; whitespace check clean and remote unchanged before commit.
