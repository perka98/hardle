-- Run after anti-cheat.sql. Read-only statistics for the authenticated account.
begin;
create or replace function public.hardle_my_stats()
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object(
  'played',count(*),
  'wins',count(*) filter(where r.won),
  'totalScore',coalesce(sum(r.score),0),
  'dailyScore',coalesce(sum(r.score) filter(where r.puzzle_date=(now() at time zone 'Europe/Stockholm')::date),0),
  'games',coalesce((select jsonb_agg(x) from (
   select game,count(*) as played,count(*) filter(where won) as wins,sum(score) as score
   from hardle_private.results where user_id=auth.uid() group by game order by game
  ) x),'[]'::jsonb)
 ) from hardle_private.results r where r.user_id=auth.uid() and auth.uid() is not null
$$;
revoke all on function public.hardle_my_stats() from public,anon;
grant execute on function public.hardle_my_stats() to authenticated;
commit;
