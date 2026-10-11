# Place reviews

Apply `202610100003_place_reviews.sql` then `202610100005_review_place_catalog.sql` before the frontend. The catalog is generated from all existing curated places plus the new nearby directory. Reviews can target only catalog IDs, preventing arbitrary spam targets.

All visitors can read public review text, 1–5 stars, count/average, date, and the chosen display name. A completed, eligible member can create/update one review per place, choose profile-name or anonymous display, and delete their own review. Anonymous output says “Anonymous student” with no account ID, email, profile avatar or cross-place alias; the internal account association remains available for moderation. Text is 10–2000 characters, rendered as text by React. Ten new place reviews/day, enforced under a per-member database lock. Banned members' reviews are excluded; deleting an account cascades to their reviews and reports.

The base tables have RLS and no browser-role grants. All access is through explicit security-definer RPCs with a fixed search path. Review reports are member-only, 5–500 characters, one per reporter/review, up to 20/day. Reports are stored privately for the project operators to inspect via the Supabase dashboard; reporting does not automatically remove a review or alter ratings. No automated moderation or response-time promise is made.

RPCs:

- `kampuscape_place_reviews(p_place_id text, p_offset integer default 0)` → `{count, average, reviews, mine}`; 20-item pages, anonymous-safe public shape, own review separately available for editing.
- `kampuscape_save_review(p_place_id text, p_rating integer, p_body text, p_anonymous boolean)` → stable review UUID; upserts caller's place review.
- `kampuscape_delete_review(p_review_id uuid)` → void; only caller-owned records.
- `kampuscape_report_review(p_review_id uuid, p_reason text)` → void; private report, idempotent per caller/review.

The UI loads only the selected place's reviews, keeps personal state in memory, clears it on account/place change, preserves content on request failure, and polls only while subscribed/visible/online. Lists render 60 places at a time. The map renders at most 180 nearby in-view place markers; moving/zooming updates them and selecting/searching a place prioritizes its marker. All directory entries remain available through search, categories and pagination.

Validation: PGlite executes the real migration with synthetic Supabase roles and checks anonymous identity, no user-ID leaks, guest write denial, own-row updates, invalid input, reports, bans and cascade deletion. The browser fixture checks named/anonymous posting/edit/delete, guest sign-in, mobile layout, sourced student benefit, library search, place pagination, and the marker bound. No real reviews or accounts are created by these checks.

Combined release: message-notification migration `202610100004_message_emails.sql` is applied, but its two Supabase Vault secrets are not configured. Message requests/chat work; notification emails remain inactive until `kampuscape_resend_api_key` and `kampuscape_resend_from` are added to Vault. The existing Pages welcome-email secret does not automatically configure database notifications.
