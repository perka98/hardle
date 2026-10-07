-- Read-only public Daily summary. No player identifiers or current solution.
begin;
create or replace function public.hardle_daily_summary()
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object(
 'played',count(*),'correct',count(*) filter(where won),
 'yesterday',(select p.secret_solution->'reveal' from hardle_private.puzzles p
 where p.game='daily' and p.puzzle_date=(now() at time zone 'Europe/Stockholm')::date-1)
 ) from hardle_private.results
 where game='daily' and puzzle_date=(now() at time zone 'Europe/Stockholm')::date
 and player_id not like 'guest:concurrency-test-%'
$$;
revoke all on function public.hardle_daily_summary() from public;
grant execute on function public.hardle_daily_summary() to anon,authenticated;
commit;
