# Shared interface · Hassan maintains, both agree

**Status:** Contract not drafted. This is the checklist for B01, not an implemented API.

## Agree before integration

- Record shapes for places, dated events, student meetups, benefits, and hosts.
- Discovery filters, pagination, coordinates, and time-zone representation.
- Session/verification states and consistent error responses.
- Join/leave behavior, counts, cancellation, and named/nickname display fields.
- Chat, report, and block operations; identity fields clients may receive.

Add a versioned contract and synthetic request/response examples here once agreed. Select the format with the backend stack. Frontend and backend should use the same examples.

## Change process

1. Request a change in your own workflow handoff log.
2. Agree on the behavior and affected task IDs.
3. Hassan updates the contract and examples together; record the change and compatibility impact.
4. Bhagesh updates the frontend; Hassan updates the backend. Verify one complete journey together.

Never send restricted internal identity mappings in normal client responses. Avoid breaking an agreed response shape without coordinating the frontend update.
