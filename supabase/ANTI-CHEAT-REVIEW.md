# Anti-cheat implementation gate

Inspection: 2026-10-06. No security changes applied or published.

## Confirmed current weaknesses
- Daily: answer selection, complete song catalog, answer metadata and media source mappings are in public HTML/JS.
- DJdle: full answer pool and deterministic date selection are public.
- Artist: all clue data and deterministic date selection are public.
- Orderdle: public JSON exposes birth dates, so the solution can be computed before submission.
- scoring.js records points entirely in localStorage; it is not competitive validation.
- Daily local restrictions and progress in other games can be reset by clearing browser data.
- Existing Supabase daily_results write uses a public key. Actual database grants/policies were NOT inspectable, so database enforcement is unknown.
- Account preview has no server-owned puzzle sessions, no competitive submission, no automatic unique profile provisioning and no refresh flow. It is not a finished authentication/leaderboard system.
- Vercel env ls reports no configured project environment variables. No protected server database credential or trusted private backend is available.

## Required server design
- Private puzzle data outside Vercel static public root, with a secret-keyed daily selection or private scheduled assignment. No public files containing solution maps, birthdays or future puzzles.
- Authenticated identity validated server-side with Supabase Auth; guests receive signed HttpOnly SameSite Secure session cookies. Anonymous replay is enforceable per guest identity, not per human after cookie deletion or device change.
- Persistent tables: puzzle assignments, sessions, ordered guess events, immutable final results and review flags. Unique (identity, date, game). Atomic database transaction/row lock for each guess; database-owned attempt sequence and score, plus request idempotency key.
- Guess API accepts only game, guess and idempotency key; rejects client score/attempt/result fields. Current Stockholm date chosen by server. No arbitrary future-date query.
- Preserve existing feedback rules and exact point scale; compute Orderdle results and scores using server-only birth dates.
- Shared persistent rate limits per identity and coarse IP, not memory-only function counters. Flag unusually fast play and abnormal rates; do not punish shared IP users solely on IP.
- Read-only leaderboard over immutable verified server results. No client insert/update policies. Legacy guest/browser results excluded from competitive rankings.
- Migrate all four clients to server start/guess/result responses without changing presentation; no client fallback to insecure competitive scoring.

## Product security constraints
- Daily Song must deliver recognizable audio to the browser. Existing YouTube/SoundCloud embeds expose video/track URLs. Strict pre-completion answer concealment requires licensed, server-controlled anonymized clips and removing revealing third-party embed metadata. Audio remains recognizable by design.
- Search/accepted guesses necessarily reveal candidate names; they must not reveal which candidate is selected, solution metadata or daily/future answer schedules.
- Previously published puzzle data and daily answers cannot be made secret retroactively. Rotate future assignments after migration and audit old deployed aliases/static files.

## External setup needed
Use Supabase Dashboard SQL Editor to install transactional server schema and RLS after review. Supply a restricted server database credential through protected Vercel Environment Variables, never chat or client code. Configure Auth, unique profiles, email confirmation and allowed URLs. Existing SQL is only a leaderboard shell and does not satisfy these requirements.

## Verification gates before live
Concurrent requests cannot exceed attempts or award twice; replay preserves original results; forged scores and invalid bodies fail; expired/forged auth fails; cross-user access fails; future-date reads fail; localStorage edits do not affect authoritative state; rate-limit storage shared across instances; static artifact scan finds no solution schedules; UI/animation regression checks; real browser audio verification; database grants and leaderboard read policy verified.

## Accepted media limitation (user decision, 2026-10-06)
Existing SoundCloud/YouTube media is retained. Media URLs/metadata can reveal the Daily Song. This is an accepted limitation, not a guarantee of hidden answers. Server scoring, immutable submissions and rate limits are still required. No licensed anonymous clips are required for this implementation scope.
