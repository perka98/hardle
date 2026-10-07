-- HARDLE private anti-cheat foundation. Run once in Supabase SQL Editor.
-- Does not modify existing game tables, profiles, results or public policies.
-- Not sufficient on its own: trusted game validator and client migration required.
begin;
create schema if not exists hardle_private;
revoke all on schema hardle_private from public, anon, authenticated;
create table if not exists hardle_private.puzzles (
 puzzle_date date not null,
 game text not null check(game in ('daily','djdle','artist','orderdle')),
 rules_version integer not null default 2,
 secret_solution jsonb not null,
 public_payload jsonb not null,
 primary key(puzzle_date,game)
);
create table if not exists hardle_private.sessions (
 id uuid primary key default gen_random_uuid(),
 player_id text not null,
 puzzle_date date not null,
 game text not null,
 started_at timestamptz not null default now(),
 attempts integer not null default 0 check(attempts between 0 and 7),
 completed boolean not null default false,
 unique(player_id,puzzle_date,game),
 foreign key(puzzle_date,game) references hardle_private.puzzles(puzzle_date,game)
);
create table if not exists hardle_private.guesses (
 session_id uuid not null references hardle_private.sessions(id),
 attempt integer not null check(attempt between 1 and 7),
 request_id uuid not null,
 guess jsonb not null,
 feedback jsonb not null,
 created_at timestamptz not null default now(),
 primary key(session_id,attempt),
 unique(session_id,request_id)
);
create table if not exists hardle_private.results (
 session_id uuid primary key references hardle_private.sessions(id),
 player_id text not null,
 user_id uuid references auth.users(id),
 puzzle_date date not null,
 game text not null,
 score integer not null check(score between 0 and 1000),
 won boolean not null,
 attempts integer not null check(attempts between 1 and 7),
 finished_at timestamptz not null default now(),
 unique(player_id,puzzle_date,game)
);
create table if not exists hardle_private.rate_buckets (
 bucket_key text not null,
 window_start timestamptz not null,
 hits integer not null default 0,
 primary key(bucket_key,window_start)
);
create table if not exists hardle_private.review_flags (
 id bigint generated always as identity primary key,
 session_id uuid references hardle_private.sessions(id),
 category text not null,
 detail jsonb not null default '{}',
 created_at timestamptz not null default now()
);
alter table hardle_private.puzzles enable row level security;
alter table hardle_private.sessions enable row level security;
alter table hardle_private.guesses enable row level security;
alter table hardle_private.results enable row level security;
alter table hardle_private.rate_buckets enable row level security;
alter table hardle_private.review_flags enable row level security;
revoke all on all tables in schema hardle_private from public,anon,authenticated;
revoke all on all sequences in schema hardle_private from public,anon,authenticated;
-- Results must not be rewritten, including by an accidentally privileged API.
create or replace function hardle_private.reject_result_change()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Verified results are immutable'; end;
$$;
revoke all on function hardle_private.reject_result_change() from public,anon,authenticated;
drop trigger if exists immutable_result on hardle_private.results;
create trigger immutable_result before update or delete on hardle_private.results
for each row execute function hardle_private.reject_result_change();
-- A dedicated validator database role must receive least-privilege grants separately.
-- Do not expose hardle_private through Supabase REST or grant browser access.
commit;
