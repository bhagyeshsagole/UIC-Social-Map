# Kampuscape accounts

Target project: [ddhqammspwmmrprpolfw](https://supabase.com/dashboard/project/ddhqammspwmmrprpolfw).

The implementation provides email/password accounts with verification links and Google OAuth sign-in, exact `uic.edu` membership, and private profiles containing name, optional pronouns, a preset avatar and 1–8 interests. Email verification confirms mailbox control, not current enrollment.

## Connection status

Code and local PostgreSQL/browser checks are implemented. The remote migration, Auth hooks, email delivery, Google provider configuration and public browser key still need to be applied/verified through the project connection. Do not call sign-in live until these steps pass.

## Apply to the existing project

1. Inspect the existing database and Auth configuration before applying [202610070001_uic_profiles.sql](migrations/202610070001_uic_profiles.sql). It creates a new `kampuscape_profiles` table, functions and an `auth.users` email guard; it does not remove existing users. With an authenticated CLI, from `website/backend`, run `supabase link --project-ref ddhqammspwmmrprpolfw`, then `supabase db push --dry-run` and `supabase db push`. Alternatively, run the migration in the project's SQL editor. Apply it once through the migration system.
2. In Authentication → Hooks, enable both Postgres hooks:
   - Before User Created: `public.kampuscape_before_user_created`
   - Custom Access Token: `public.kampuscape_access_token_hook`
3. Enable email sign-ups and email confirmation. Keep anonymous sign-in and manual identity linking disabled; keep secure email changes enabled. Set OTP length to 6 and expiry to 600 seconds. Use [confirmation.html](templates/confirmation.html) for **Confirm signup** and [recovery.html](templates/recovery.html) for **Reset password**. These buttons point back to the app with `token_hash` and `type=email|recovery`; the app calls `verifyOtp`, removes the token from the URL and opens onboarding or the new-password form. Numeric codes are not used in these two flows.
4. Configure an existing SMTP provider for delivery to real UIC addresses. Supabase's default mail service restricts recipients; successful mocked browser tests do not verify mail delivery. Keep email rate limits enabled.
5. Enable Google under Authentication → Sign In / Providers using the project's Google OAuth web client. Add `https://ddhqammspwmmrprpolfw.supabase.co/auth/v1/callback` to Google's authorized redirect URIs. The Google client secret stays in Supabase. A Google account must have a verified UIC address; the `hd=uic.edu` chooser hint is not the security boundary.
6. Configure Site URL for the deployed app and allow exact callback URLs. The current Pages configuration uses `https://kampuscape.com/uic` (no trailing slash; the client redirects to origin + pathname). Include `http://localhost:5173/` and `http://127.0.0.1:5173/` for local development, plus the precise development URL when using a different port. Do not use unrestricted wildcard redirects.
7. Copy `website/frontend/.env.example` to `.env.local`, fill `VITE_SUPABASE_PUBLISHABLE_KEY` with the project's publishable key, and rebuild. Set both public `VITE_` variables in the production build environment too. No service-role key or Google secret belongs in a browser variable.

## Security model

- The Auth database trigger rejects non-UIC addresses, pending non-UIC email changes and anonymous accounts. Exact domain matching rejects subdomains and suffix tricks.
- The before-create hook returns a useful error for email and OAuth signup.
- The access-token hook checks the canonical `auth.users` record for UIC email, confirmation, anonymous status and bans on issuance and refresh. Existing non-UIC users are denied new tokens once the hook is enabled.
- RLS rechecks the current Auth record, independently of user-editable metadata and stale email claims. A verified member can select, insert and update only their own profile. Anonymous clients have no profile grants. No public profile list is exposed.
- Database constraints validate name/pronoun lengths, avatar IDs, catalog interests and duplicates. Profile timestamps are maintained by a trigger.
- The browser validates again for clear feedback. Google and email share the same profile. New members complete onboarding before account actions are enabled.
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

Before releasing, verify a real UIC signup email link and password-reset link, real UIC Google sign-in, rejection of a non-UIC Google account, callback redirects, profile persistence from a second browser, and direct non-UIC signup rejection. Never use real user data as test fixtures.

References checked October 7, 2026: [Auth hooks](https://supabase.com/docs/guides/auth/auth-hooks), [before user creation](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), [token hooks](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook), [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Publish signup and recovery email templates

Changing the local HTML alone does not change Supabase's outgoing emails. In Authentication → Emails, copy the matching template into Confirm signup and Reset password, including the subjects from `config.toml`. Preserve SMTP, redirect URLs, Google settings and Auth hooks.

Alternatively, with `SUPABASE_ACCESS_TOKEN` supplied securely in the environment, run:

```sh
node website/backend/supabase/sync-email-templates.mjs --check
node website/backend/supabase/sync-email-templates.mjs
```

This script updates only those two subjects and bodies and reads them back to verify the save. It never prints the management token or other Auth configuration. Deploy the matching frontend with `npm run deploy` from `website/frontend`. Test new emails after changing templates; previously delivered code emails do not change.
