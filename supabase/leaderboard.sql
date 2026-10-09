-- Run in Supabase SQL Editor. Does NOT import browser scores.
create table if not exists public.hardle_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check (username ~ '^[A-Za-z0-9_]{3,24}$')
);
create unique index if not exists hardle_username_ci on public.hardle_profiles(lower(username));
create table if not exists public.hardle_verified_results (
 user_id uuid not null references public.hardle_profiles(user_id) on delete cascade,
 puzzle_date date not null,
 game text not null check (game in ('daily','artist','djdle','orderdle')),
 score integer not null check (score between 0 and 1000),
 primary key(user_id,puzzle_date,game)
);
alter table public.hardle_profiles enable row level security;
alter table public.hardle_verified_results enable row level security;
-- No client write policies. Trusted server validator must be built before awarding points.
create or replace function public.hardle_leaderboard(period text)
returns table(username text,score bigint)
language sql stable security definer set search_path=public
as $$
 select p.username,sum(r.score)::bigint from hardle_profiles p
 join hardle_verified_results r on p.user_id=r.user_id
 where period in ('daily','total') and (period='total' or r.puzzle_date=(now() at time zone 'Europe/Stockholm')::date)
 group by p.user_id,p.username order by sum(r.score) desc,p.username asc limit 100
$$;
revoke all on function public.hardle_leaderboard(text) from public;
grant execute on function public.hardle_leaderboard(text) to anon,authenticated;
-- Provision profiles explicitly until registration/profile transaction is implemented.
