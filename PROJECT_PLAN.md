# Kampuscape — Living Plan and Tracker

Last updated: 2026-10-07 (America/Chicago)
Phase: First local frontend prototype; production decisions and backend remain open<br>
Team: Bhagesh — frontend; Hassan — backend, data, and deployment  
Current review: [Evidence, loopholes, and recommendations](EVENT_MAP_REVIEW.md)

## Chosen direction

A map-based portal for UIC students to discover places and events in Chicago, understand relevant benefits, see other members planning to go, and connect before attending. Users can display their name or participate using a generated nickname.

The team selected this direction. Stop generating unrelated alternatives. A local UI prototype now implements map discovery, place details, bookmarks, private events pinned to buildings, and shareable event snapshots. Accounts, synchronized shared events, attendance, chat, backend services, deployment, and outreach remain unimplemented.

## Living-document rules

For each subsequent project request, read this plan, update affected requirements/decisions/tasks, record completion evidence, and append the change log. Keep IDs stable. Separate user-approved requirements from assistant recommendations. Preserve superseded decisions in the history rather than silently treating old plans as current.

Statuses: TODO, IN PROGRESS, AWAITING TEAM INPUT, BLOCKED, DONE, DEFERRED, SUPERSEDED.

## Accepted requirements from the team

| ID | Requirement | Status |
| --- | --- | --- |
| E01 | Map-centered portal with Chicago places/events relevant to UIC students | Local frontend prototype built; no backend |
| E02 | UIC students are the intended membership; require verification through a UIC email | Accepted goal; email alone does not prove current enrollment, mechanism unresolved |
| E03 | Seed places and recommendations using the builders' local knowledge | Accepted; factual benefits still need verification |
| E04 | Surface student benefits and practical information, including free/discounted admission where documented | Seven sourced prototype listings; field-level caveats included |
| E05 | Let users express intent to attend and see others planning to go | Accepted; time/group semantics to define |
| E06 | Offer a named attendance option and a generated-username option | Accepted; audience and identity-linkage rules to define |
| E07 | Enable chatting with other participants, including people using generated usernames | Accepted; group/direct-message permissions to define |
| E08 | Support discovering new people as well as participation by existing friend groups | Accepted; not built |
| E09 | Broad student appeal, easy access, and repeat use; do not turn this into an academic/study product | Accepted |
| E10 | Two people with clear file ownership to minimize Git conflicts | Accepted; Bhagesh / Hassan ownership established below |
| E11 | Research loopholes and key decisions before finalizing the implementation plan | Initial review complete; team decisions pending |

The user examples—Busy Burger, an Art Institute visit, Chicago Botanic Garden, and a concert/party venue—illustrate experiences. They are not verified upcoming events or authorized promotions. Do not publish invented times, prices, discounts, or attendees.

## Research findings that change the design

1. **UIC email is not current-student verification or a safety guarantee.** Faculty/staff use UIC email, and eligible alumni can retain email forwarding. Rechecking the mailbox each semester does not prove enrollment.
2. **Event nicknames are pseudonyms.** Maintaining accountability requires a restricted internal account link. Do not promise untraceability or protection from recognition/screenshots.
3. **Art Institute student admission is supported; blanket Botanic Garden student admission is not.** Store eligibility and booking conditions per benefit.
4. **Free events are already free to publish on Eventbrite.** Focus the proposition on UIC relevance, curated benefits, and joining people.
5. **Radiate, Partiful, UIC Loop, UIC Connection, and Flames in the City overlap with parts of this idea.** Evaluate the complete UIC outing experience, not just a map interface.

Sources and details are in [EVENT_MAP_REVIEW.md](EVENT_MAP_REVIEW.md). These are corrections to assumptions, not rejection of the chosen concept.

## Decisions pending — recommendations are not approvals

| ID | Decision | Proposed starting point | State |
| --- | --- | --- | --- |
| EV01 | Membership boundary | User accepted exact verified `uic.edu` email membership via Supabase email OTP or Google; this verifies a mailbox, not enrollment | Accepted 2026-10-07; hosted configuration pending |
| EV02 | What a map pin represents | Separate place, dated external event, and student meetup records | Proposed |
| EV03 | Who sees names, nicknames, and attendance | Login required; meetup-scoped nickname by default, explicit name opt-in; no public attendance history | Proposed |
| EV04 | How chat and blocks work | Meetup group chat plus accepted requests for DMs; blocks follow internal accounts across nicknames | Proposed |
| EV05 | Who creates events/meetups | Verified members submit plans; team reviews pilot listings; consistent host profile and public venues initially | Proposed |
| EV06 | Age policy and venue restrictions | Decide supported ages; show event restrictions separately from UIC verification | Open |
| EV07 | Retention and moderation ownership | Define post-event chat/attendance lifetime, report handling, restricted evidence retention, and account deletion | Open |
| EV08 | Place/content and map providers | Curated official-source content plus licensed map provider; compare costs and data-use requirements | Open |
| EV09 | Pilot scope and outcomes | Concentrated set of useful places and real hosted outings; measure actual connections and repeat participation | Proposed |
| EV10 | Stack, hosting, budget, timeline | Select after core decisions; no tools or deadlines committed | Open |

## Two-person ownership — agreed split

> [!info] Workflow A · Bhagesh
> UI, visualization, frontend map rendering, and client integration. Owns `website/frontend/**` and [Workflow A](WORKFLOW_A_BHAGYESH.md).

---

> [!info] Workflow B · Hassan
> Backend, map-provider selection, adding events, data, and deployment. Owns `website/backend/**`, `website/data/**`, `website/contracts/**`, `website/deployment/**`, and [Workflow B](WORKFLOW_B_HASSAN.md).

---

Hassan is the proposed single editor for shared configuration and planning files; this coordination default can change. Both agree on the API contract; Hassan maintains it. Each person writes progress and outgoing partner messages in their own tracker. Frontend/backend keep separate dependency files.

See the [workspace guide](README.md) for folder boundaries and the [website guide](website/README.md) for integration. Path ownership reduces conflicts; integration and Git synchronization are still necessary.

Content curation is assigned to Hassan. Ongoing report handling still needs an explicit team decision under EV07.

## Shared milestones

Detailed implementation tasks live in the two owner trackers. These milestones track team outcomes, not duplicate every task.

- [x] **MAP01 · Capture the selected concept.** E01–E11 above.
- [x] **MAP02 · Research assumptions and loopholes.** [Concept review](EVENT_MAP_REVIEW.md); recommendations are not automatically approved.
- [x] **ORG01 · Organize the workspace and assign A/B ownership.** Parent notes, nested website workspace, separate progress and handoff logs. Obsolete project files removed.
- [ ] **N03 · Check the experience with students.** Use the selected concept; no outreach has been sent.
- [ ] **MAP03 · Set membership, identity, chat, host, age, and moderation rules.** EV01–EV07 awaiting team decisions. Design sketches, source collection, contract drafting, and provider evaluation can proceed.
- [ ] **MAP04 · Confirm first-release scope and pilot.** EV09–EV10; owner trackers provide an initial build sequence, not a finalized release commitment.
- [ ] **INT01 · Agree on the first interface and sample responses.** Hassan B01 + Bhagesh review; enables independent implementation.
- [ ] **INT02 · Complete one preview journey together.** Discover → join with chosen identity → chat → leave; requires frontend/backend integration evidence.

## How this plan stays current

- Update the affected owner's tracker after every project request: task state, evidence, blockers, handoffs, and date.
- Update this plan when requirements, decisions, or shared milestones change.
- Preserve IDs; append new tasks instead of renumbering completed work.
- Mark changes of direction explicitly. Do not treat proposed research recommendations as accepted product rules.
- Keep deployment commands/configuration in `website/deployment/`, not in partner-message logs.

## Change log

- **2026-10-07:** Accepted Kampuscape as the project name, replacing Afterclass. A24 updates page titles, frontend package metadata, shared documentation and synthetic contract display names. Browser storage uses Kampuscape keys with legacy reads to preserve saved places and drafts. Existing repository directory paths remain stable.

- **2026-10-04:** Selected UIC social discovery map with membership, attendance identity choices, and chat.
- **2026-10-04:** Completed concept review; corrected email-verification, admission, and Eventbrite assumptions. Product decisions remain open.
- **2026-10-04:** Assigned Workflow A to Bhagesh and Workflow B to Hassan. Created the parent coordination folder and nested website workspace, including separate trackers and deployment notes. Removed rejected ideas, complaint-portal research, and obsolete archives at the team's request. Application development has not started.
- **2026-10-05:** Scope widened at the user's request: places now include bars, nightlife, music venues, comedy and city sights within 6 miles of UIC (was 4), not only student-discount spots. The student badge marks documented student perks only. See Workflow A, A19.
- **2026-10-06:** Added B11 for a local UIC Connections ICS importer. It is independent of B01 and B10: B01 defines the shared data contract, B10 covers weekly Chicago place refreshes, and B11 imports the monthly UIC Connections feed into local JSON without scheduling or storage.
- **2026-10-06:** Completed B11's local ICS parser, normalization, duplicate prevention, tests, and live import. The 2026-10-06 feed yielded 657 canonical events from 666 records; monthly scheduling remains deferred until storage integration. B10 remains the separate weekly Chicago place-content refresh.
- **2026-10-06:** Live events widened at the user's request: UIC Connection events now cover 12 Chicago months and stay listed until they end, so series already underway appear. The frontend still reads the CampusGroups JSON feed; B11's ICS output is not wired in. See Workflow A, A22.
- **2026-10-06:** Blank UIC event locations are now filled from the official calendar file (via Hassan's B11 parser) and reviewed quotes from public event descriptions. Locations UIC keeps behind sign-in stay hidden. The frontend import now depends on B11's `parseIcs`/`mergeEvents` exports. See Workflow A, A23.

## First UI scope accepted on 2026-10-04

- Floating glass navigation inspired by reference 1; muted 3D building map inspired by reference 2.
- Central Chicago pilot bounds, UIC camera on reload, no 2D toggle.
- Automatic day/night based on each day's Chicago sunrise and sunset.
- Search, place details, free/discount benefits, food tags, menu highlights, hours, and Google Maps links.
- [added_sites.md](added_sites.md) is the name/description source for all UI locations. Stable IDs preserve bookmarks and drafts.
- [Humanizer](Skills/humanizer/SKILL.md) installed locally for copy.
- Weekly Chicago place-content refresh is a future task: [B10](SUNDAY_REFRESH_TASK.md). The UIC Connections calendar is a separate monthly import under B11.

Implementation choices for this reversible prototype: React + Vite, MapLibre GL JS 6, OpenFreeMap vector tiles, and SunCalc. Production provider/hosting decisions remain Hassan's responsibility under B02. Kampuscape is the project name, accepted on 2026-10-07 (replacing the provisional Afterclass name). Saved places and event drafts are local only. The central rectangle is a pilot extent, not the Chicago municipal polygon.

- **2026-10-04:** Built the first local map UI per the supplied references, added seven researched places and editable Markdown copy, and created the Sunday refresh handoff. No backend job or deployment was activated.

## UI refinements accepted on 2026-10-05

The original Chicago restriction and always-3D/no-toggle decisions above are superseded. The map now allows world exploration, starts at UIC on every reload, and offers explicit 2D/3D controls. Two-finger scrolling pans; rotation, pitch, and roll are available without scroll-driven tilt.

Discovery is an on-demand bottom-center glass sheet. Guest and detail views use glass, with close controls. The header is smaller; time, live dot, branding, welcome copy, reminder footer, road names, and decorative map widgets are removed. UIC has a text-only label and red gradient buildings based on official directory locations matched to map footprints.

Saved holds bookmarked places; My Events holds event drafts. These remain local-only until account and backend work is implemented. Campus geometry cleanup merges connected and overlapping parts across tile seams to avoid 3D flicker. See the frontend README for coverage and refresh limitations.

- **2026-10-05:** Added a north-up alignment button above 2D/3D: roll resets to zero and 3D tilt aligns to 45°. Navigation order is Explore → Live events → My Events → Saved → Create event → Search.

- **2026-10-05:** Moved UIC label to the central Lecture Center courtyard. Keep every place pin visible; only active name boxes reposition to avoid overlap. User requested pushing the accumulated local UI work.


## UIC Connection integration accepted on 2026-10-05

- User supplied the UIC Connection calendar as a source for Live events. Show events that have not yet ended from the current Chicago month through the next 11 months, sorted by start time; exclude ended events. (Changed 2026-10-06 from "not-yet-started, current month only"; Workflow A, A22.)
- Include official registration/details links and public location links. For venues withheld by UIC Connection, link to the official page and indicate that sign-in may be needed.
- A12 implements a public-feed importer, sanitized dated snapshot, list/Spotlight search, and a 15-minute cached same-origin feed for local dev/preview. Static builds include the snapshot; ongoing production refresh awaits hosting/backend integration (Workflow A H03).

- **2026-10-05:** Completed local UIC Connection integration. Verified 178 October source listings and imported 141 future-start events at the initial check; counts automatically decrease with time. 28 unit tests, build, desktop/mobile browser checks, and live local API verification passed. No production deployment or scheduler was activated.

- **2026-10-05:** User requested a larger, less crowded Live events sheet and three category tags. Implemented UIC, Off-campus, and Community, with host-based affiliation (UIC outings remain UIC even at external venues). Independent venue listings appear under Off-campus. Community is reserved for published user events and currently shows an empty state; private drafts remain in My Events. Desktop/mobile layout and category switching verified.

- **2026-10-05:** User requested event-card navigation to buildings and purple coloring for all Live events venues. A15 implements purple precedence over UIC red for matched upcoming-event buildings, automatic removal with event expiry/feed changes, and compact event details after map navigation. Public indoor locations match verified venue coordinates/footprints; outdoor locations get a marker, and private/unmatched locations retain official details links. 33 unit tests, build, and desktop/mobile browser validation passed.


## Building-first private events accepted on 2026-10-05

- Create event starts by selecting a building from search or by tapping a map footprint. Show the building’s existing events so users can select one or create their own. No numbered onboarding progress strip.
- Private events save locally, turn their building yellow, appear in My Events, and can be deleted. Yellow takes precedence over other building colors; removing the last local event restores the building’s normal color.
- The lower-left glass legend is Red / UIC Building, Purple / Off Campus Events, Yellow / Private Events. This supersedes A15’s all-event-venues-purple rule: UIC buildings retain red unless a private event highlights them yellow.
- Any event can be shared through a copyable message link. The current frontend carries a validated snapshot in the URL fragment and opens its precise venue in a fresh browser. Locations withheld by the source remain withheld. Links require a reachable host; localhost links are not public. Snapshots are not revocable or synchronized after deletion; shared storage and account-based authorization remain backend work.
- A glass pill beside Chicago shows the total public events currently available in Live events (UIC feed plus venue listings). It opens Live events and updates with the feed/time filters.
- Building event panels use the actual selected venue name above “Upcoming events”; focused public-event cards also identify their venue instead of the generic “EVENT BUILDING.”

- **2026-10-05:** A17 implements the building-first creation and existing-event branch, yellow buildings/deletion, shareable snapshots, three-color legend, public event total, and dynamic venue headings. User explicitly authorized simultaneous work with A16; its hover previews/date filters are preserved. No backend or deployment was added.

- **2026-10-05:** Follow-up share UI: removed “SEND A PLAN,” the navigation explanation, and snapshot/deletion paragraph at the user’s request. The event name is the share heading and page/native-share title. External messaging services may still use cached/server-rendered metadata for rich previews; the static fragment-link prototype does not provide per-event server metadata.

- **2026-10-05:** A17 creation-order correction supersedes search/dialog-first setup: Create event opens the map with a yellow pin cursor; clicking a building pins it and immediately previews its roof in yellow; Continue then opens onboarding with existing-event/new-event choices. Cancel/Escape clears only the temporary preview. Connected campus footprints choose the nearest named venue instead of the first annotation.


## Accounts and interests accepted on 2026-10-07

- Supabase project `ddhqammspwmmrprpolfw` is selected for Auth and private onboarding profiles. Email-code and Google sign-in must enforce the exact `uic.edu` domain server-side.
- Onboarding collects display name, optional pronouns, a preset avatar and 1–8 interests. Members can edit these later. Supabase profiles are private to their owner under RLS.
- Public discovery remains available; saving places and creating plans requires a completed account. Device-local bookmarks/drafts are scoped per signed-in user. Synchronized event storage remains a separate task.
- A versioned keyword pipeline tags event content on refresh. For you ranks current events against explicitly selected interests, explains matches and supports date filtering. No demographic inference is used.
- A25 / B12 contains the local implementation and tested database migration. Hosted migration, Auth hooks, SMTP/email delivery, Google provider and browser environment values require the project connection and real-flow verification before release. See [Supabase setup](website/backend/supabase/README.md).
