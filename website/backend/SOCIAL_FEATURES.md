# Event shares, messaging, and feed refresh

Release activation on 2026-10-10: both migrations are applied to the hosted Supabase project. Pages runtime secrets are configured; frontend deployment `9e9625b5` and scheduled Worker `91c74746-688a-49f6-8d88-5f41c4897f66` are live (A35/B19).

## Release order

1. Apply `supabase/migrations/202610100001_event_shares.sql` and `202610100002_direct_messages.sql` after the existing migrations in the same project (`ddhqammspwmmrprpolfw`). Use the Supabase SQL editor or an authenticated CLI migration deployment; these migrations are additive. No service-role key belongs in the browser.
2. Set the Cloudflare Pages **runtime** variable `SUPABASE_PUBLISHABLE_KEY` to the project's public/publishable key. Build-time `VITE_*` variables alone do not configure a Pages Function. `VITE_SUPABASE_PUBLISHABLE_KEY` is also accepted as a runtime fallback. The share renderer uses the existing project's URL.
3. From `website/frontend`, run `npm test`, `npm run build:pages`, then the project's authorized Pages deployment process. The build includes `public/fonts/inter-share.ttf` and its OFL license. Regenerate the committed font, if needed, with `node scripts/build-share-font.mjs`; rendering runs in the Pages Function using bundled resvg WASM.
4. Check a synthetic private event with two test accounts: Share → `/uic/share/<token>` returns HTML metadata without JavaScript, `/image.png` returns a 1200×630 PNG, Open event on the map opens the correct venue, and deleting the owned event makes both routes return 404. Verify an actual messaging request cannot send until accepted, then acceptance, reading, decline, and blocking from the other account.
5. Optionally enable unattended feed refresh using the Worker below. Existing request-driven edge refresh works without KV.

Supabase management access was restored for A35/B19. The migrations and immediate-signup/recovery-template settings are applied, and Pages has the Resend API key, existing sender, and public project key. Existing password-change protections are preserved. The preceding immediate-signup/Resend setup remains documented in [supabase/README.md](supabase/README.md).

## Link privacy and lifecycle

Private event drafts stay on their owner's device. Clicking Share saves a whitelisted event snapshot behind a random UUID token, using the authenticated profile's host name. Anyone holding that URL, including a messaging service's preview crawler, can see the host, event, date/time, venue, and description. Private links are unlisted, not an authenticated guest list. Pages return `noindex`, `no-store`, and `no-referrer`; third-party platforms control their own preview caches.

Tokens stay stable when the owner shares again, expire 31 days after the event date, and can be revoked only by the owner. Account deletion cascades to links. A database ban makes links unavailable. The RPC exposes neither owner IDs nor emails. Old hash links still open their snapshots, but cannot produce crawler thumbnails or be revoked; only new share-page links have those properties. Expired records are inaccessible but are not automatically deleted; retention cleanup remains an operational policy decision.

## Messaging and identity

Members find Message in Who’s going. The frontend sends an event-scoped opaque attendance contact ID; the server resolves both people and their displayed names. A generated event nickname stays the displayed name in that conversation. A sender without attendance appears under their profile name; the confirmation states that name before sending. Names are frozen per conversation, avoiding later profile changes exposing an event alias.

Only a recipient can accept or decline a pending request. No text can be sent or fetched before acceptance. Blocking is account-wide in either direction, including other events and aliases. Unblocking restores the original conversation status. Declining cannot be reset by repeated requests. Existing accepted history is retained server-side after blocking; the UI hides it while blocked. Account deletion removes associated threads, messages, and blocks. Messaging data has no localStorage cache.

RLS and revoked table grants prevent direct table reads/writes. Security-definer RPCs validate membership, ownership and participation. Pair locks serialize request/accept/block/send operations; per-sender locks enforce 15 new requests/day and 30 messages/minute. Message bodies are limited to 2,000 characters, send retries use UUID idempotency keys, and history uses 50-message keyset pages. Inboxes show the latest 200 conversations. Reporting and automated retention beyond account deletion remain separate work.

## Efficient refresh and resilience

The browser preloads the shipped event snapshot concurrently with live data and shares one request/timer per resource. Public feed caches survive reloads; attendance and inbox caches are scoped to the signed-in account and cleared on account changes. Failures retain last-good data with retry states. Timers stop when hidden/offline and resume on focus/connectivity; backoff reduces repeated failures. Campus feeds refresh every 15 minutes, community events every minute, attendance every 30 seconds, inboxes every 15 seconds, and only an open conversation every 8 seconds. This is polling, not push delivery or a promise that a closed browser stays running.

The Pages endpoint uses a 15-minute fresh window, serves its last-good feed for up to seven days while refreshing with `waitUntil`, and coalesces concurrent origin loads within each isolate. Optional KV supplies durable shared snapshots across edge locations. Cache API refresh is implemented explicitly rather than relying on unsupported automatic stale-while-revalidate behavior.

For refresh while nobody is visiting:

1. Create a Cloudflare KV namespace for the campus feed.
2. Bind it as `EVENT_CACHE` in the Pages production environment.
3. Set the same namespace ID in the `kv_namespaces` block of both Wrangler files.
4. Deploy from `website/backend/event-refresh` with Wrangler. The cron is every 15 minutes. It imports only the existing official-source feed and reviewed public locations, then writes `campus:<Chicago YYYY-MM>` with a seven-day TTL. Failed imports leave the previous KV value intact.
5. Monitor Worker errors and verify the KV feed's `fetchedAt` advances. Remove the cron/Worker to stop unattended refresh; Pages request-driven refresh continues.

The production KV namespace `ad9686b78d9a43739baf0731a387d236` is configured as `EVENT_CACHE` in both Wrangler files. The Worker is deployed with cron `*/15 * * * *`. Live Pages checks returned 285 events with a fresh feed, expected 404s for unavailable share tokens, and 401 for an unauthenticated welcome-email request. The mobile guide opens/reopens without page errors. Real welcome/reset email delivery remains untested.

## Local verification

`npm test` includes actual migrations executed in PGlite with synthetic Auth roles, cross-user permission probes, alias/block checks, link revocation/account deletion, cache failure/session-isolation checks, recommendations, and escaped share metadata. `tests/social-smoke.mjs` drives two synthetic users through guide, visit recommendations, sharing, request/accept/chat/block, and mobile layout. No real accounts, messages, or emails are sent by these tests.
