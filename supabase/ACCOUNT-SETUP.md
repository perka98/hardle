# Account preview — initial phase, not complete competition system
- Guest games and local scores remain unchanged.
- Uses existing Supabase project's public publishable key (not a service-role key).
- Registration and sign-in use Supabase Auth REST. Sessions are tab-local; expiry requires signing in again. No refresh/session sync implemented yet.
- In Supabase Dashboard → Authentication → Providers, confirm Email is enabled; configure SMTP and rate limits before public launch.
- Authentication → URL Configuration: set Site URL to https://hardle.app and allowed confirmation destinations as appropriate. Verify registration and confirmation on preview before launch.
- Run leaderboard.sql in SQL Editor to create read-only leaderboard infrastructure. Profiles are not yet automatically provisioned; no untrusted client writes allowed.
- Required next phase: unique profile provisioning, authenticated server-owned puzzle sessions, authoritative guess/order validation, result submission with idempotency and limits, and testing. Current games reveal answers in client code, so client score uploads are NOT acceptable competitive validation.
- Do not expose a Supabase service-role key to the browser. Do not import legacy/browser points into competitive rankings.
