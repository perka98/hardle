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
