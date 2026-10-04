# UIC Social Discovery Map — Living Plan and Tracker

Last updated: 2026-10-04 (America/Chicago)  
Phase: Chosen concept; research and product decisions before implementation  
Team: Bhagesh — frontend; Hassan — backend, data, and deployment  
Current review: [Evidence, loopholes, and recommendations](EVENT_MAP_REVIEW.md)

## Chosen direction

A map-based portal for UIC students to discover places and events in Chicago, understand relevant benefits, see other members planning to go, and connect before attending. Users can display their name or participate using a generated nickname.

The team selected this direction. Stop generating unrelated alternatives. The current task is to prepare separate implementation workflows while resolving remaining product decisions. No application, accounts, live listings, or outreach have been created.

## Living-document rules

For each subsequent project request, read this plan, update affected requirements/decisions/tasks, record completion evidence, and append the change log. Keep IDs stable. Separate user-approved requirements from assistant recommendations. Preserve superseded decisions in the history rather than silently treating old plans as current.

Statuses: TODO, IN PROGRESS, AWAITING TEAM INPUT, BLOCKED, DONE, DEFERRED, SUPERSEDED.

## Accepted requirements from the team

| ID | Requirement | Status |
| --- | --- | --- |
| E01 | Map-centered portal with Chicago places/events relevant to UIC students | Accepted; not built |
| E02 | UIC students are the intended membership; require verification through a UIC email | Accepted goal; email alone does not prove current enrollment, mechanism unresolved |
| E03 | Seed places and recommendations using the builders' local knowledge | Accepted; factual benefits still need verification |
| E04 | Surface student benefits and practical information, including free/discounted admission where documented | Accepted; not built |
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
| EV01 | How to enforce current-student membership | Determine whether an approved affiliation/enrollment check is available; describe any email-only pilot as UIC-email verified | Open |
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
> UI, visualization, frontend map rendering, and client integration. Owns `website/frontend/**` and [Workflow A](WORKFLOW_A_BHAGESH.md).

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

- **2026-10-04:** Selected UIC social discovery map with membership, attendance identity choices, and chat.
- **2026-10-04:** Completed concept review; corrected email-verification, admission, and Eventbrite assumptions. Product decisions remain open.
- **2026-10-04:** Assigned Workflow A to Bhagesh and Workflow B to Hassan. Created the parent coordination folder and nested website workspace, including separate trackers and deployment notes. Removed rejected ideas, complaint-portal research, and obsolete archives at the team's request. Application development has not started.
