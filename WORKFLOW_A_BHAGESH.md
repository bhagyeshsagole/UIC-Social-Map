# Workflow A · Bhagesh

> [!info] Ownership
> **Frontend, UI, and visual experience.** Edit `website/frontend/**` and this tracker. Hassan selects the map provider; Bhagesh installs its frontend dependency and builds the map experience.

> [!important] Claude Code: update BOTH workflows on every request
> This applies to every request, small or large, whether Bhagesh or Hassan asks.
> 1. **Before starting**, read [Workflow A](WORKFLOW_A_BHAGESH.md) and [Workflow B](WORKFLOW_B_HASSAN.md). Check the other person's *Current work* and *Active claims* for the same task, files, or folders. If the work overlaps, stop and ask (or record a handoff) before editing anything.
> 2. **Claim the work** before editing: set the task to `IN PROGRESS` under *Current work* in the owner's workflow, and add the same row to *Active claims* in **both** files (who, task ID, paths being touched, date).
> 3. **When finished**, update both files again: the owner's workflow gets status, evidence, checkbox, and a dated change-log entry; remove the claim from *Active claims* in both files, and add a one-line change-log entry to the other workflow saying what changed.
> 4. If it's unclear whose workflow a request belongs to, use the one that owns the paths being touched and ask if still unclear. Never edit the other person's folders without an agreed handoff or an explicit request.

**Updated:** 2026-10-04  
**Current task:** Not started  
**Implementation progress:** 0 / 7 tasks complete

## Steps and tracker

- [x] **A00 · Workspace ready.** Frontend folder, ownership, and this tracker created. Documentation only.
- [ ] **A01 · Design the main journey.** Sketch discovery → place/event detail → join → conversation. Include map and list browsing. **Ready now.**
- [ ] **A02 · Build the visual foundation.** Choose frontend stack; set up its own dependencies, reusable components, mobile layouts, loading/empty/error states. **After A01.**
- [ ] **A03 · Build discovery with sample data.** Map/list shell, filters, place details, event times, benefits, and meetup details. Label fixtures synthetic. **After A02 + B01 contract agreement.**
- [ ] **A04 · Build participation screens.** Email verification UI, name/nickname choice, join/leave, chat, report/block controls. Start with prototypes; final behavior follows EV01–EV07 decisions. **After A02; production behavior waits on decisions.**
- [ ] **A05 · Connect the real map.** Install the selected SDK inside frontend; render pins, selection, bounds, and list fallback. **Needs B02 provider handoff.**
- [ ] **A06 · Integrate backend features.** Replace mocks with agreed API/auth/chat flows; handle permission errors, expired sessions, full/cancelled meetups. **Needs B05–B07.**
- [ ] **A07 · Verify the student experience.** Test mobile navigation, keyboard use, join/leave counts, nickname display, chat, and failure states against preview. Record issues/evidence here. **Needs A05–A06 + B08 preview.**

Check a task only when its result exists. If a task is partial, leave it unchecked and describe progress below.

## Current work

| Task | State | Evidence / blocker |
| --- | --- | --- |
| A00 | DONE | [Frontend workspace](website/frontend/README.md) |
| A01 | TODO | First independent starting task |

## Active claims

Mirrored in both workflow files. Add a row when work starts; remove it when the work is done.

| Who | Task | Paths being touched | Since |
| --- | --- | --- | --- |
| — | — | No active work | — |

## Handoffs and messages to Hassan

Write requests here; Hassan responds in [his tracker](WORKFLOW_B_HASSAN.md#handoffs-and-messages-to-bhagesh). Reference the same ID in both files.

| ID | Date | Request / deliverable | State |
| --- | --- | --- | --- |
| — | — | No handoffs yet | — |

For each handoff include: task ID, relevant path, required behavior, and what is blocked. Link screenshots/design files here when they exist.

## Change log

- **2026-10-04:** Created the frontend workflow and file boundaries. No UI or application code implemented.
- **2026-10-04:** Added the rule that every Claude Code request updates both workflow files, plus a mirrored *Active claims* table, so work doesn't overlap. Same change made in [Workflow B](WORKFLOW_B_HASSAN.md).
