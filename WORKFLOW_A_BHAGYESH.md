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
**Current task:** A11 complete; project snapshot ready for requested Git push<br>
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

## Current work

| Task | State | Evidence / blocker |
| --- | --- | --- |
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

For each handoff include: task ID, relevant path, required behavior, and what is blocked. Link screenshots/design files here when they exist.

## Change log

- **2026-10-06:** Bhagesh approved Hassan's B01 API/data contract and synthetic fixtures. B01 is complete, and its mirrored active claim has been removed; no frontend work was started.
- **2026-10-06:** Hassan completed B11's local UIC Connections ICS importer. It produces normalized JSON with duplicate prevention and has no frontend, storage, or scheduled-job integration; the agreed monthly schedule remains deferred until storage integration.
- **2026-10-06:** Hassan drafted the B01 API/data contract and synthetic fixtures for review. No frontend files changed; the mirrored B01 claim remains active while Bhagesh reviews the contract.
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
