# Workflow B · Hassan

> [!info] Ownership
> **Backend, maps/provider selection, event data, and deployment.** Edit `website/backend/**`, `website/data/**`, `website/contracts/**`, `website/deployment/**`, and this tracker.

> [!important] Claude Code: update BOTH workflows on every request
> This applies to every request, small or large, whether Bhagesh or Hassan asks.
> 1. **Before starting**, read [Workflow A](WORKFLOW_A_BHAGESH.md) and [Workflow B](WORKFLOW_B_HASSAN.md). Check the other person's *Current work* and *Active claims* for the same task, files, or folders. If the work overlaps, stop and ask (or record a handoff) before editing anything.
> 2. **Claim the work** before editing: set the task to `IN PROGRESS` under *Current work* in the owner's workflow, and add the same row to *Active claims* in **both** files (who, task ID, paths being touched, date).
> 3. **When finished**, update both files again: the owner's workflow gets status, evidence, checkbox, and a dated change-log entry; remove the claim from *Active claims* in both files, and add a one-line change-log entry to the other workflow saying what changed.
> 4. If it's unclear whose workflow a request belongs to, use the one that owns the paths being touched and ask if still unclear. Never edit the other person's folders without an agreed handoff or an explicit request.

**Updated:** 2026-10-04  
**Current task:** Not started  
**Implementation progress:** 0 / 9 tasks complete

## Steps and tracker

- [x] **B00 · Workspace ready.** Backend, data, contracts, deployment folders, and this tracker created. Documentation only.
- [ ] **B01 · Agree on the data/API contract.** Draft place, event, meetup, attendance, identity, and chat response shapes; review with Bhagesh and publish synthetic fixtures. Keep unresolved policy fields explicit. **Ready now; agreement needed before calling it stable.**
- [ ] **B02 · Choose the map provider.** Compare SDK fit, coverage, pricing, quotas, and content-use terms; document the choice, browser-key restrictions, and setup details for Bhagesh. **Ready now.**
- [ ] **B03 · Set up backend and storage.** Select backend/database/hosting within an agreed budget; keep dependencies separate from frontend. Implement initial schema after B01. **Evaluation ready now.**
- [ ] **B04 · Add the first real places and events.** Define seed format; record sources, coordinates, times/time zones, benefit conditions, and last-checked dates. Build a repeatable import/update path. **After B01; initial source collection can begin now.**
- [ ] **B05 · Build membership and discovery APIs.** Implement agreed email verification/access rules, sessions, and place/event/meetup retrieval. Test authorization server-side. **Needs B03 + EV01 decision.**
- [ ] **B06 · Build participation and messaging.** Join/leave, attendance counts, named/pseudonymous display, chat permissions, blocks, and reports. Keep internal identity links restricted. **Needs B05 + EV02–EV07 decisions.**
- [ ] **B07 · Verify backend behavior.** Test unauthorized access, duplicate joins, block evasion across nicknames, cancelled events, and data deletion/retention rules. Document contract changes and integration handoff. **Needs B05–B06.**
- [ ] **B08 · Set up preview deployment.** Configure builds, secrets, database changes, auth callbacks, permitted origins, quotas, and logs. Record exact setup and rollback steps. **Needs B02–B03 and runnable frontend/backend.**
- [ ] **B09 · Prepare pilot release.** Confirm verified listings, agreed moderation owner, working preview, and A07/B07 evidence. Record launch decision with Bhagesh before public release. **Needs shared pilot-scope decision.**

Check a task only when its result exists. These tasks do not imply approval of a paid service or public launch.

## Current work

| Task | State | Evidence / blocker |
| --- | --- | --- |
| B00 | DONE | [Website workspace](website/README.md) |
| B01 | TODO | First interface handoff to Bhagesh |
| B02 | TODO | Can proceed alongside B01 |

## Active claims

Mirrored in both workflow files. Add a row when work starts; remove it when the work is done.

| Who | Task | Paths being touched | Since |
| --- | --- | --- | --- |
| — | — | No active work | — |

## Handoffs and messages to Bhagesh

Write requests here; Bhagesh responds in [his tracker](WORKFLOW_A_BHAGESH.md#handoffs-and-messages-to-hassan). Reference the same ID in both files.

| ID | Date | Request / deliverable | State |
| --- | --- | --- | --- |
| — | — | No handoffs yet | — |

Provider handoff should include the SDK, supported version, configuration variable names, cost limits, and any attribution requirements. Never put actual credentials here.

## Change log

- **2026-10-04:** Created the backend workflow and file boundaries. No provider, backend, database, or deployment configured.
- **2026-10-04:** Added the rule that every Claude Code request updates both workflow files, plus a mirrored *Active claims* table, so work doesn't overlap. Requested by Bhagesh; same change made in [Workflow A](WORKFLOW_A_BHAGESH.md).
