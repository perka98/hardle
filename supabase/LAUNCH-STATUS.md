# Launch status: BLOCKED — anti-cheat not complete

## Implemented locally and unit-tested
Signed guest cookies; Auth token verification; strict request bodies; secret-seeded puzzle builder; transactional processor; request idempotency; immutable result inserts; rate-limit code; private schema SQL; minimal search; client network adapter; server score rules; regression tests.

## Required external operations
- Run launch-install.sql after anti-cheat.sql. SQL is prepared, not PostgreSQL-tested.
- Supply SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on Preview for authenticated server validation.
- Verify HARDLE_DATABASE_URL connects with TLS and restricted role.
- Verify real concurrent DB requests, RLS isolation, function permissions and unique results.

## Required code work, not complete
- Existing Daily, DJdle, Artist and Orderdle remain client-owned. The secure adapter is NOT integrated.
- Daily server catalogue migration and public search not complete.
- Leaderboard profile provisioning, server-backed results query and account session handling incomplete.
- No production enablement permitted before complete integration and real browser testing.
- Static rewrite denial needs verification against deployed routes/build assets.
- The current gameplay data files and client answer schedules remain public in existing clients.

## Never enable blindly
HARDLE_SECURE_GAMEPLAY_ENABLED is intentionally unset; API fails closed. Changing it does not migrate the games and does not constitute anti-cheat launch.

## Rollback
Production remains the prior stable deployment. Existing localStorage data must be preserved. The original checkpoint is 5df873373323b899c2ee1a579ca6ed65e9a22bf0. Do not publish partial security code as completed protection.

Preview rebuild requested after project resume on 2026-10-06. Security remains disabled pending integration.

## October 7 continuation (preview-only development)
- Private puzzle builder now accepts `previousAnswers` and excludes all previous-day Orderdle IDs or the previous single-game answer. Exhausted pools fail closed.
- Added all-four-game exclusion tests and 100 consecutive Orderdle rounds; full unit suite passes.
- This is a builder safeguard, NOT a completed production feature: provisioning must read the previous persisted private puzzle through a restricted function and pass its answer IDs. Do not grant broad table SELECT to the validator role merely to implement this.
- Client migration and database verification remain required. Current production UI updates must be preserved when integrating; this security branch is based on the earlier paused implementation.
- Follow-up: provisioning now reads yesterday’s persisted answer IDs via the restricted `previous_answers` function. Install `previous-puzzle.sql` after launch-install.sql. Function grants exclude public/anon/authenticated; no expanded table read policy. Provisioning mock test covers forwarding exclusions and fail-closed malformed responses. SQL remains unexecuted and unverified on real PostgreSQL.
- Added isolated `/secure-orderdle.html` preview client: server-provided names/IDs only, server score/result/history, no local answer or scoring fallback, explicit unavailable state, retry retains same order and request ID. Existing `/orderdle` remains unchanged. End-to-end requires verified database and preview-only enablement; this page is not a claim of working deployed protection.
- Added isolated `/secure-djdle.html` server-owned client. No embedded answer/dictionary or local scoring; renders server letter feedback, restores server history, locks completed rounds, preserves retry guess. Browser/end-to-end testing remains outstanding; secure gameplay gate is unchanged.
- Added isolated `/secure-artist.html` client with server search, server progressive clues/history/results, pending-guess retry and no local answer catalog. Syntax checked and shared tests pass; no real browser/DB validation yet. Existing Artist page remains unchanged.
