# UIC Social Discovery Map API Contract

**Version:** `2026-10-06.v1`  
**Status:** Proposed; Bhagesh and Hassan must review before implementation.  
**Format:** REST-style JSON over HTTPS. The backend may use any implementation, but response shapes below are the compatibility target.

## Contract rules

- Stable, globally unique IDs are required for places, events, users, and user-owned records.
- Dates use RFC 3339 timestamps. Date-only values use `YYYY-MM-DD` only when they are calendar dates, not timed events.
- Coordinates are `[longitude, latitude]` in decimal degrees.
- All object fields are optional only when the contract explicitly says they may be absent.
- A normal API response must never contain passwords, session secrets, service credentials, internal account identifiers, or internal nickname mappings.
- The frontend must not assume that `@uic.edu` proves current enrollment. The contract uses the phrase **UIC email verified** only for an email-verification result.
- The backend owns authorization. The frontend may display only the fields allowed for the current user and the current resource's visibility.

## Versioning and compatibility

- The API version is part of the path: `/api/v1`.
- Backward-compatible additions may be made to this version.
- Removing or changing the meaning of a field requires a new API version.
- The contract's examples are synthetic and must not be treated as real user data.

## Core objects

### Place

A place is a permanent venue or destination. It is not a dated outing.

```json
{
  "id": "place:art-institute",
  "name": "Art Institute of Chicago",
  "description": "A museum with paintings, sculpture, and photography.",
  "category": "Arts & culture",
  "address": "111 S Michigan Ave",
  "neighborhood": "The Loop",
  "coords": [-87.6237, 41.8796],
  "student": true,
  "benefit": "Free with UIC ID",
  "kind": "free",
  "condition": "Free general admission for UIC students with a student i-card at the admissions counter. Separately ticketed programs may cost extra.",
  "hours": "Mon, Wed, Fri–Sun 11am–5pm · Thu 11am–8pm · Tue closed. Confirm hours before visiting.",
  "schedule": [
    [660, 1020],
    [660, 1020],
    null,
    [660, 1020],
    [660, 1200],
    [660, 1020],
    [660, 1020]
  ],
  "weekly": null,
  "tags": ["Museum", "UIC perk"],
  "diet": {
    "nonveg": "yes",
    "veg": "options",
    "vegan": "ask",
    "gf": "ask",
    "halal": "ask"
  },
  "menu": null,
  "menuUrl": null,
  "sources": [
    {"label": "UIC admission policy", "url": "https://cada.uic.edu/museum-admission/"},
    {"label": "Visitor information", "url": "https://www.artic.edu/visit"}
  ],
  "events": [
    {
      "title": "Mary Cassatt: After Impressionism",
      "start": "2026-09-06",
      "end": "2027-01-03",
      "description": "Paintings, pastels, and prints from Cassatt’s later career.",
      "url": "https://artsandculture.google.com/event/g11yms0806g"
    }
  ],
  "photo": {
    "file": "art-institute.jpg",
    "alt": "Bronze lion in front of the Art Institute of Chicago on Michigan Avenue",
    "credit": "Nicholas Hartmann · CC BY-SA 4.0",
    "href": "https://commons.wikimedia.org/wiki/File:2014_Chicago_Art_Institute_02.jpg",
    "focus": "32% 50%"
  },
  "accent": "purple",
  "createdAt": "2026-10-04T00:00:00Z",
  "updatedAt": "2026-10-04T00:00:00Z"
}
```

**Field decisions:**

- Preserve the frontend's existing API v1 field names: `coords`, `student`, `benefit`, `kind`, `condition`, `hours`, `schedule`, `weekly`, `tags`, `diet`, `menu`, `menuUrl`, `sources`, `events`, `photo`, and `accent`.
- Keep `kind` as the existing frontend classification: `free`, `discount`, or `regular`. It is not a place type and must not be renamed to `venue` in API v1.
- Keep `events` as linked dated events, not as a list of user plans. A place itself does not imply that an event is happening now.
- `student` is a boolean indicating whether the place has a student-related benefit. It is not a current-enrollment verification result.
- `benefit`, `condition`, and `weekly` preserve the frontend's display and confirmation language. They are not guarantees of eligibility, admission, or current availability.
- `menu` is an array of menu entries. Each entry contains a name, price, description, and optional dietary tags. The frontend may use this without an additional request.
- `photo` is optional and must include the complete frontend structure: `file`, `alt`, `credit`, `href`, and `focus`. A licensed source URL and attribution are required when the source requires them.
- `createdAt` and `updatedAt` are server-managed metadata.

**Backend-to-frontend mapping:** If a backend data model uses names such as `studentBenefit`, `latitude`, or `image`, the implementation must map them to these API v1 names. The API response must not silently change the meaning of `kind` or omit fields needed by the frontend.

### Event

An event is a dated, externally or locally hosted outing. It is separate from a place.

```json
{
  "id": "event:gallery-400-press-pull",
  "title": "Press & Pull",
  "description": "Prints and stories from Robert Blackburn’s cooperative printmaking workshop.",
  "placeId": "place:gallery-400",
  "location": "Gallery 400",
  "coordinates": [-87.6495, 41.8763],
  "startAt": "2026-09-11T10:00:00-05:00",
  "endAt": "2026-12-12T17:00:00-06:00",
  "timeZone": "America/Chicago",
  "host": {"type": "organization", "id": "organization:gallery-400"},
  "source": {"type": "external", "url": "https://gallery400.uic.edu/exhibition/pressandpull/"},
  "sourceEventId": null,
  "status": "published",
  "createdAt": "2026-10-04T00:00:00Z",
  "updatedAt": "2026-10-04T00:00:00Z",
  "lastCheckedAt": "2026-10-04T00:00:00Z",
  "lastUpdatedAt": "2026-10-04T00:00:00Z"
}
```

For imported events, `sourceEventId` and the source URL are the duplicate-prevention keys. The importer must still reconcile the source data before publishing or updating an event.

### Student-created meetup/event

A meetup is a user-created or team-approved plan. It may point to a place and may be public or private.

```json
{
  "id": "meetup:example-1",
  "title": "Study session at the Art Institute",
  "description": "A small group study visit after class.",
  "placeId": "place:art-institute",
  "coordinates": [-87.6237, 41.8796],
  "startAt": "2026-10-12T14:00:00-05:00",
  "endAt": "2026-10-12T17:00:00-05:00",
  "timeZone": "America/Chicago",
  "creatorUserId": "user:example",
  "hostDisplayName": "Hassan",
  "visibility": "group",
  "status": "scheduled",
  "createdAt": "2026-10-06T00:00:00Z",
  "updatedAt": "2026-10-06T00:00:00Z"
}
```

**Unresolved:** whether a meetup is public, private, or invitation-only; who reviews drafts; whether only verified UIC members may create them; and whether a user can edit a meetup after attendance begins.

### User and identity

A user has a backend account ID and may choose a public display name. Internal account-to-display-name mappings must remain server-side.

```json
{
  "id": "user:example",
  "email": "student@uic.edu",
  "displayName": "Kampuscape",
  "identityType": "pseudonymous",
  "emailVerified": true,
  "emailVerification": {
    "verifiedAt": "2026-10-06T12:00:00Z",
    "method": "uic-email"
  },
  "profile": {
    "bio": null,
    "preferredName": null,
    "createdAt": "2026-10-06T12:00:00Z"
  },
  "accountStatus": "active",
  "updatedAt": "2026-10-06T12:00:00Z"
}
```

The normal public user object must omit `email`, verification internals, and any internal identity mapping. The backend may return the email only to the owning user or to an authorized service.

**Unresolved:** the exact account-linking model for generated nicknames, whether names are public, how a user can opt into a real name, and whether account deletion must retain a restricted audit record.

### Session/auth state

The session must be a server-managed credential. The client should receive a short-lived session in an HTTP-only cookie or equivalent secure token transport, not in a normal JSON object that is persisted by the frontend.

```json
{
  "authenticated": true,
  "user": {
    "id": "user:example",
    "displayName": "Kampuscape",
    "identityType": "pseudonymous"
  },
  "session": {
    "id": "session:opaque-id",
    "expiresAt": "2026-10-07T12:00:00Z",
    "lastSeenAt": "2026-10-06T12:00:00Z"
  }
}
```

The server must rotate session tokens, invalidate them on logout, and expire them. The response must never include the token value in a normal fixture or frontend response.

### User-owned records

The contract uses separate records so a user can save a place or event without changing the canonical record.

```json
{
  "id": "saved-place:example",
  "userId": "user:example",
  "placeId": "place:art-institute",
  "place": {
    "id": "place:art-institute",
    "name": "Art Institute of Chicago",
    "description": "A museum with paintings, sculpture, and photography.",
    "category": "Arts & culture",
    "coords": [-87.6237, 41.8796],
    "address": "111 S Michigan Ave",
    "neighborhood": "The Loop",
    "student": true,
    "benefit": "Free with UIC ID",
    "kind": "free",
    "condition": "Free general admission for UIC students with a student i-card at the admissions counter.",
    "hours": "Mon, Wed, Fri–Sun 11am–5pm · Thu 11am–8pm · Tue closed. Confirm hours before visiting.",
    "schedule": [[660, 1020], [660, 1020], null, [660, 1020], [660, 1200], [660, 1020], [660, 1020]],
    "weekly": null,
    "tags": ["Museum", "UIC perk"],
    "diet": {"nonveg": "yes", "veg": "options", "vegan": "ask", "gf": "ask", "halal": "ask"},
    "menu": null,
    "menuUrl": null,
    "sources": [],
    "events": [],
    "photo": null,
    "accent": "purple"
  },
  "createdAt": "2026-10-06T12:00:00Z"
}
```

```json
{
  "id": "saved-event:example",
  "userId": "user:example",
  "eventId": "event:gallery-400-press-pull",
  "event": {
    "id": "event:gallery-400-press-pull",
    "title": "Press & Pull",
    "description": "Prints and stories from Robert Blackburn’s cooperative printmaking workshop.",
    "placeId": "place:gallery-400",
    "location": "Gallery 400",
    "coordinates": [-87.6495, 41.8763],
    "startAt": "2026-09-11T10:00:00-05:00",
    "endAt": "2026-12-12T17:00:00-06:00",
    "timeZone": "America/Chicago",
    "host": {"type": "organization", "id": "organization:gallery-400"},
    "source": {"type": "external", "url": "https://gallery400.uic.edu/exhibition/pressandpull/"},
    "sourceEventId": null,
    "status": "published",
    "createdAt": "2026-10-04T00:00:00Z",
    "updatedAt": "2026-10-04T00:00:00Z",
    "lastCheckedAt": "2026-10-04T00:00:00Z",
    "lastUpdatedAt": "2026-10-04T00:00:00Z"
  },
  "createdAt": "2026-10-06T12:00:00Z"
}
```

```json
{
  "id": "created-event:example",
  "userId": "user:example",
  "meetupId": "meetup:example-1",
  "title": "Study session at the Art Institute",
  "placeId": "place:art-institute",
  "startAt": "2026-10-12T14:00:00-05:00",
  "endAt": "2026-10-12T17:00:00-05:00",
  "timeZone": "America/Chicago",
  "visibility": "group",
  "status": "scheduled",
  "createdAt": "2026-10-06T12:00:00Z",
  "updatedAt": "2026-10-06T12:00:00Z"
}
```

```json
{
  "id": "joined-event:example",
  "userId": "user:example",
  "eventId": "event:gallery-400-press-pull",
  "title": "Press & Pull",
  "placeId": "place:gallery-400",
  "startAt": "2026-09-11T10:00:00-05:00",
  "endAt": "2026-12-12T17:00:00-06:00",
  "timeZone": "America/Chicago",
  "status": "joined",
  "displayName": "Kampuscape",
  "createdAt": "2026-10-06T12:00:00Z",
  "updatedAt": "2026-10-06T12:00:00Z"
}
```

The user-owned GET responses must contain the complete resource fields needed by the corresponding screen. They must not require the frontend to issue additional requests for place details, event details, or attendance state already returned by the list. Saved-place and saved-event responses embed the current place/event object; created-event responses contain the complete meetup/event fields; joined-event responses contain the complete event fields plus the current user's attendance state.

### Future chat and reports/blocks

These shapes are reserved for future work and do not imply implementation.

```json
{
  "id": "message:example",
  "conversationId": "conversation:example",
  "senderUserId": "user:example",
  "senderDisplayName": "Kampuscape",
  "body": "Are we meeting at the entrance?",
  "createdAt": "2026-10-06T12:00:00Z",
  "readBy": []
}
```

```json
{
  "id": "report:example",
  "targetType": "message",
  "targetId": "message:example",
  "reason": "abusive",
  "status": "open",
  "createdAt": "2026-10-06T12:00:00Z"
}
```

```json
{
  "id": "block:example",
  "userId": "user:example",
  "blockedUserId": "user:other",
  "createdAt": "2026-10-06T12:00:00Z"
}
```

**Unresolved:** conversation permissions, whether direct messages are permitted, who can see reports, how blocks are enforced across pseudonymous identities, and how long messages and moderation evidence are retained.

## Suggested endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/places` | List public places with optional filters |
| GET | `/api/v1/places/{id}` | Get one place |
| GET | `/api/v1/events` | List published events, including filters for date and place |
| GET | `/api/v1/events/{id}` | Get one event |
| GET | `/api/v1/current-user` | Get the authenticated user's public profile and account state |
| GET | `/api/v1/current-user/saved-places` | Return the current user's saved places with complete place fields needed by the Saved screen |
| POST / DELETE | `/api/v1/current-user/saved-places/{placeId}` | Save or unsave a place |
| GET | `/api/v1/current-user/saved-events` | Return the current user's saved events with complete event fields needed by the Saved screen |
| POST / DELETE | `/api/v1/current-user/saved-events/{eventId}` | Save or unsave an event |
| GET | `/api/v1/current-user/created-events` | Return the current user's created events with complete meetup/event fields needed by the My Events screen |
| POST | `/api/v1/current-user/created-events` | Create a user event |
| PATCH | `/api/v1/current-user/created-events/{id}` | Update the identified user event |
| DELETE | `/api/v1/current-user/created-events/{id}` | Delete the identified user event |
| GET | `/api/v1/current-user/joined-events` | Return the current user's joined events with complete event fields needed by the attendance screen |
| POST / DELETE | `/api/v1/current-user/joined-events/{eventId}` | Join or leave an event |
| POST | `/api/v1/auth/signup` | Create an account after email verification |
| POST | `/api/v1/auth/login` | Authenticate and establish a session |
| POST | `/api/v1/auth/logout` | Revoke the current session |
| DELETE | `/api/v1/current-user/account` | Delete the account and user-owned personal data |

All write operations must return a consistent error shape. Errors must not reveal whether an account or resource exists unless that disclosure is explicitly allowed by the authorization policy.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested event was not found.",
    "requestId": "request:example"
  }
}
```

## Account deletion contract

Account deletion is a user-initiated, irreversible action that must be defined before implementation. The minimum required behavior is:

1. Require an authenticated user and explicit confirmation.
2. Revoke every active session and any related refresh tokens.
3. Remove the user's email, profile, saved places/events, created events, attendance records, and other user-owned personal data that must not remain.
4. Preserve only the minimum legally or operationally required audit record, with no email, display name, or message content unless explicitly required.
5. Return a success response only after the deletion transaction completes.
6. Do not keep a reusable account-to-nickname mapping after deletion.
7. Do not delete canonical public places or events that other users may legitimately reference; only remove user-owned links and records.
8. Make deletion idempotent from the API perspective: a second request for the same account returns a clear authorization or not-found result without revealing internal details.

**Unresolved:** the retention period for audit records, whether anonymous participation counts remain visible, whether a deleted account may be recreated with the same email, whether a permanent account tombstone is required for data-retention or moderation reasons, and what happens to a meetup/event created by a deleted user.

The team must decide whether a meetup/event that other users joined is deleted, cancelled, or retained without the creator's personal information after account deletion. The implementation must apply that decision consistently to both public and private meetups.

## Errors and status codes

- `200` for successful reads and idempotent operations.
- `201` for created resources.
- `400` for malformed input.
- `401` when authentication is missing or expired.
- `403` when the user is authenticated but not authorized.
- `404` when a resource is not visible to the caller.
- `409` for conflicts such as duplicate joins or duplicate saved records.
- `422` for business-rule validation failures.
- `500` for unexpected server failures.

## Product decisions still open

- EV01: current-student membership and the exact mechanism for UIC access.
- EV02: whether places, dated events, and student meetups are always separate records.
- EV03: who can see names, nicknames, and attendance.
- EV04: group chat, direct messages, reports, and blocks.
- EV05: who may create and review meetups.
- EV06: age policy and venue restrictions.
- EV07: retention and moderation ownership.
- EV08: map provider and content licensing.
- EV09: pilot scope and outcomes.
- EV10: stack and hosting decision.

## Review required from Bhagesh

- Confirm the place and event shapes preserve the frontend fields needed for the current UI.
- Review whether the proposed placement of `events` on a place and `placeId` on a dated event matches the frontend's discovery flow.
- Approve or change the public visibility rules for meetup and attendance data.
- Review the sample endpoint names and response field names before backend implementation.
- Confirm that the synthetic examples contain no real user data or credentials.

## Implemented social RPC extension — 2026-10-10

These additive Supabase RPCs are implemented and locally validated; hosted migration is pending. The existing attendee endpoint is unchanged. See [behavior and deployment](../backend/SOCIAL_FEATURES.md).

| RPC | Arguments | Result / access |
| --- | --- | --- |
| `kampuscape_share_event` | `p_event jsonb` | Stable UUID share token; completed member, own event only; authoritative profile host |
| `kampuscape_shared_event` | `p_token uuid` | Whitelisted snapshot plus host and shareToken, or null; exact-token public access; no account IDs/emails |
| `kampuscape_revoke_share` | `p_event_id uuid` | Void; deletes caller-owned link |
| `kampuscape_event_contacts` | `p_event_key text` | Existing display fields plus nullable event-scoped `contact_id`; guests receive count-only rows |
| `kampuscape_request_message` | `p_contact_id uuid` | Thread UUID; server-resolved participant and names, idempotent pair/event request |
| `kampuscape_message_inbox` | none | Latest 200 caller-owned threads; display_name/avatar_id/your_name, incoming/status, blocked/blocked_by_you, unread, updated_at; no counterpart user ID |
| `kampuscape_message_action` | `p_thread_id uuid`, `p_action text` | `accept`, `decline` (recipient only), `block`, `unblock`, `read`; participant only |
| `kampuscape_message_history` | `p_thread_id uuid`, optional `p_before bigint` | 50 descending `{id,body,is_you,created_at}` messages; accepted thread participant only |
| `kampuscape_send_message` | `p_thread_id uuid`, `p_body text`, `p_client_id uuid` | Message ID; accepted, unblocked participants; UUID retry deduplication; 2,000 characters |

Text cannot be sent before acceptance. Blocks follow internal accounts across event aliases, enforced transactionally. New requests are limited to 15/day and texts to 30/minute per sender. SQLSTATE `42501` means unavailable/forbidden, `22023` invalid input, and `54000` rate limit. Tables are not directly available to browser roles. Account deletion cascades to social records.
