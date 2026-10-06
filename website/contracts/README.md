# Shared interface · Hassan maintains, both agree

**Status:** Proposed version `2026-10-06.v1`; B01 contract draft is ready for review, not implemented.

## Contract

- [API contract](API_CONTRACT.md) defines the versioned data model, endpoint shapes, account deletion behavior, and unresolved product decisions.
- [Synthetic fixtures](fixtures.json) provide simple examples for the frontend before the backend exists.
- No real user data, passwords, session secrets, service credentials, or internal identity mappings are included.

## Review checklist

- Confirm place fields preserve the current frontend's discovery and detail needs.
- Confirm dated events remain separate from permanent places and student meetups.
- Review public identity, attendance, chat, report, and block visibility rules.
- Review account deletion and retention decisions before backend implementation.
- Agree on endpoint names and field conventions before introducing the backend.

## Change process

1. Request a change in your own workflow handoff log.
2. Agree on the behavior and affected task IDs.
3. Hassan updates the contract and examples together; record the change and compatibility impact.
4. Bhagesh updates the frontend; Hassan updates the backend. Verify one complete journey together.

Never send restricted internal identity mappings in normal client responses. Avoid breaking an agreed response shape without coordinating the frontend update.
