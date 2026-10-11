# Kampuscape accounts

Target project: [ddhqammspwmmrprpolfw](https://supabase.com/dashboard/project/ddhqammspwmmrprpolfw).

The implementation provides immediate email/password signup and login, an account-created email through Resend, recovery links through Supabase + Resend SMTP, and private profiles with name, optional pronouns, a preset avatar and 1–8 interests. No Google button, signup verification step or MFA challenge is presented. The exact `uic.edu` domain is still enforced; mailbox control and current enrollment are not verified.

## Connection status

On October 10, A35/B19 applied the social migrations, enabled immediate signup, saved the recovery-link template, and configured Pages runtime secrets using the existing verified sender. Resend SMTP and Auth hooks remain in place. Existing password-change protections are preserved. Real welcome/reset email delivery has not been exercised with a new account; no real emails were sent during release checks.

## Apply to the existing project

1. Inspect the existing database and Auth configuration before applying [202610070001_uic_profiles.sql](migrations/202610070001_uic_profiles.sql). It creates a new `kampuscape_profiles` table, functions and an `auth.users` email guard; it does not remove existing users. With an authenticated CLI, from `website/backend`, run `supabase link --project-ref ddhqammspwmmrprpolfw`, then `supabase db push --dry-run` and `supabase db push`. Alternatively, run the migration in the project's SQL editor. Apply it once through the migration system.
2. In Authentication → Hooks, enable both Postgres hooks:
   - Before User Created: `public.kampuscape_before_user_created`
   - Custom Access Token: `public.kampuscape_access_token_hook`
3. Enable email sign-ups and turn **Confirm email off** (Management API: `mailer_autoconfirm: true`). This returns a session immediately. Supabase fills `email_confirmed_at` automatically; this field no longer proves mailbox control. Existing token hooks/RLS continue to check the authoritative Auth record and UIC domain. Keep anonymous sign-in, manual identity linking and MFA enrollment/verification disabled. Preserve existing secure password-change and reauthentication protections; password recovery uses the authorized reset-link session. Existing unactivated accounts may still need recovery or support; no existing users are modified by the settings script.
4. Keep Resend SMTP configured: host `smtp.resend.com`, port `465`, user `resend`, password a server-only Resend API key, sender at the verified `kampuscape.com` domain, sender name Kampuscape. The [Resend setup guide](https://resend.com/docs/send-with-supabase-smtp) documents these settings. Set recovery-link expiry to 600 seconds and keep rate limits. Use [recovery.html](templates/recovery.html) for Reset password; its app link works on another device, with no numeric-code form.
5. Configure Cloudflare Pages **runtime** variables/secrets for the welcome-email function: `SUPABASE_PUBLISHABLE_KEY` (the existing public browser key), `RESEND_API_KEY` (secret), and `RESEND_FROM_EMAIL` (sender address at the verified domain). The function uses the fixed project URL and obtains the recipient by validating the bearer token with Supabase Auth. It accepts only accounts created in the past ten minutes and uses a stable per-account [Resend idempotency key](https://resend.com/docs/dashboard/emails/idempotency-keys) to prevent duplicate welcome emails. The browser never chooses the recipient or sees the Resend key. Delivery failure leaves the created account usable and shows a notice in onboarding. Password reset continues through Supabase's existing Resend SMTP connection. Only creation requests a welcome email; normal login sends none. Local Vite does not run Pages Functions; use `wrangler pages dev dist` after building for an integrated local check.
6. Configure Site URL for the deployed app and allow exact callback URLs. The current Pages configuration uses `https://kampuscape.com/uic` (no trailing slash; the client redirects to origin + pathname). Include `http://localhost:5173/` and `http://127.0.0.1:5173/` for local development, plus the precise development URL when using a different port. Do not use unrestricted wildcard redirects.
7. Copy `website/frontend/.env.example` to `.env.local`, fill `VITE_SUPABASE_PUBLISHABLE_KEY` with the project's publishable key, and rebuild. Set both public `VITE_` variables in the production build environment too. No service-role key, Resend key or SMTP password belongs in a browser variable.

## Security model

- The Auth database trigger rejects non-UIC addresses, pending non-UIC email changes and anonymous accounts. Exact domain matching rejects subdomains and suffix tricks.
- The before-create hook returns a useful error for email and OAuth signup.
- The access-token hook checks the canonical `auth.users` record for UIC email, confirmation, anonymous status and bans on issuance and refresh. Existing non-UIC users are denied new tokens once the hook is enabled.
- RLS rechecks the current Auth record, independently of user-editable metadata and stale email claims. An eligible member can select, insert and update only their own profile. Anonymous clients have no profile grants. No public profile list is exposed.
- Database constraints validate name/pronoun lengths, avatar IDs, catalog interests and duplicates. Profile timestamps are maintained by a trigger.
- The browser validates the UIC domain again for clear feedback. New members complete onboarding before account actions are enabled.
- Profiles sync through Supabase. Bookmarks and private drafts remain device-local, with separate storage keys per authenticated user. Existing guest records remain under their previous keys.

## Interest pipeline

[`src/interests.js`](../../frontend/src/interests.js) is the shared versioned taxonomy and deterministic classifier. It uses only public event copy, organizer and venue categories/tags. It does not use names or pronouns. Empty matches stay unclassified.

Every `fetchCampusEvents` refresh tags the live feed, including the existing Cloudflare function that imports it. Run `npm run events:interests` in `website/frontend` to retag the saved snapshot without refetching it; the script preserves source facts/fetch time and writes atomically. `npm run events:refresh` both refreshes and tags. The deployed live endpoint follows its existing 15-minute cache; no separate scheduler is required for tagging.

For you matches a member's saved interests against the current UIC and venue events. It excludes ended events, deduplicates entries, sorts by number of matched interests then start time, and displays the matching interests. Date filters still apply. Runtime classification covers new live events and venue exhibitions immediately, including older untagged snapshots. These rule-based matches are suggestions, not official event categories; review and extend the term catalog as coverage grows.

## Verification

From `website/frontend`:

```sh
npm test
npm run build
```

The database test executes the actual migration in PGlite PostgreSQL with synthetic Supabase roles and Auth records. It checks direct signup and email-change rejection, token checks, own-row RLS, unverified/anonymous denial, catalog validation and bans. It does not substitute for testing the hosted Supabase Auth service.

For deterministic browser checks (no real emails, accounts or Google requests):

```sh
VITE_SUPABASE_URL=https://kampuscape-test.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_only \
npm run dev -- --port 5174 --strictPort
# Separate terminal:
node tests/onboarding-smoke.mjs
TEST_APP_URL=http://127.0.0.1:5174 node tests/private-events-smoke.mjs
TEST_APP_URL=http://127.0.0.1:5174 node tests/campus-events-smoke.mjs
TEST_APP_URL=http://127.0.0.1:5174 node tests/smoke.mjs
```

Mocks live only in test files. There is no development-auth bypass in the product. Screenshots are under `website/frontend/artifacts/onboarding-*.png`.

Before releasing, verify immediate signup and its account-created email, email/password login without another email, a real password-reset link, callback redirects, profile persistence from a second browser, and direct non-UIC signup rejection. Never use real user data as test fixtures.

References checked October 7, 2026: [Auth hooks](https://supabase.com/docs/guides/auth/auth-hooks), [before user creation](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), [token hooks](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook), [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Apply immediate signup and recovery settings

Local files do not change hosted Auth. With `SUPABASE_ACCESS_TOKEN` supplied securely, run from the repository root:

```sh
node website/backend/supabase/sync-auth-settings.mjs --check
node website/backend/supabase/sync-auth-settings.mjs
```

The script reads existing configuration, requires an existing Resend SMTP connection (or `RESEND_API_KEY` + `RESEND_FROM_EMAIL` in the environment), enables immediate signup, saves the recovery template, and verifies the saved fields. It preserves hooks, redirects and provider credentials. Disable MFA enrollment/verification in Authentication → MFA too; the app does not enroll factors or issue challenges. Configure the Pages runtime variables before publishing the new function/frontend with `npm run deploy` from `website/frontend`.

Confirmation/magic-link templates and the older `sync-email-templates.mjs` remain for already-issued legacy links. They are not part of new signup. `AuthProvider` still accepts old confirmation links so previously sent emails do not break.

## Social feature migrations (2026-10-10)

The additive `202610100001_event_shares.sql` and `202610100002_direct_messages.sql` migrations add unlisted rich-preview pages and consent-based direct messages. Apply after all earlier migrations before deploying the corresponding frontend. [Social feature setup](../SOCIAL_FEATURES.md) covers runtime public-key configuration, RPC permissions, link revocation, account-wide blocks, verification, and optional scheduled feed refresh. Both migrations were applied to the hosted project during A35/B19.
