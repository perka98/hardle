# Hardle anti-cheat setup — foundation only

## 1. Install the private schema
In your existing Supabase project open SQL Editor → New query, paste anti-cheat.sql, and run it. It creates a new private schema and does not alter existing game/progress tables. Keep hardle_private OUT of the exposed API schemas. No browser policies or grants are created.

## 2. Protected server configuration
Vercel → perkas → hardle → Settings → Environment Variables:
- HARDLE_DATABASE_URL: protected PostgreSQL connection for a dedicated restricted validator role. Never use the public anon key as this credential. The role/grants must be reviewed and provisioned before use.
- HARDLE_SESSION_SECRET: cryptographically random signing secret (at least 32 random bytes), entered through protected environment-variable UI.
- SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY: existing project URL and publishable key for verifying Auth users.
Start with Preview only. Do not paste database passwords or signing secrets into chat. Do not put them in PUBLIC-prefixed variables or source files.

The correct trusted-role grants depend on final server transaction functions. Do not grant broad table access to anon/authenticated. Do not add a score-writing public REST policy to make requests succeed.

## 3. Remaining implementation (not delivered yet)
- Server-owned current puzzles and hidden solution data; authoritative guess evaluation for all four games.
- Atomic session lock, duplicate request handling and immutable result award.
- Guest identity cookie and Supabase token verification; registered results tied to verified identity.
- Persistent identity/IP rate limits and review flags.
- Client migration preserving UI and gameplay, without insecure fallback.
- Read-only verified leaderboard and profile registration.
- Move catalogs/solution metadata outside static served files and scan all built public assets.
- Resolve Daily audio metadata exposure with licensed anonymous clips if strict answer hiding is required.
- Concurrent, manipulated-request, replay, auth and rate-limit tests plus browser regression tests.

## Honest readiness state
SQL has not been executed or database-tested from this environment. No working anti-cheat endpoint or migration has been published. Running this schema alone does not secure the current games. Existing production behavior remains unchanged.
