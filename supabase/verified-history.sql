-- Account-only read APIs. Run after anti-cheat.sql.
begin;
create or replace function public.hardle_my_history()
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(jsonb_agg(x order by x.puzzle_date desc,x.game),'[]'::jsonb)
 from (select puzzle_date,game,score,won,attempts from hardle_private.results
 where user_id=auth.uid() and auth.uid() is not null
 order by puzzle_date desc,game limit 400) x
$$;
create or replace function public.hardle_my_game_stats(p_game text)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with mine as (
 select puzzle_date,score,won,attempts from hardle_private.results
 where user_id=auth.uid() and auth.uid() is not null
 and game=p_game and p_game in ('daily','djdle','artist','orderdle')
 ), win_days as (
 select distinct puzzle_date from mine where won
 ), islands as (
 select puzzle_date,puzzle_date-(row_number() over(order by puzzle_date))::integer as grp from win_days
 ), streaks as (
 select count(*) as streak,max(puzzle_date) as last_day from islands group by grp
 )
 select jsonb_build_object(
 'played',(select count(*) from mine),
 'wins',(select count(*) from mine where won),
 'totalScore',(select coalesce(sum(score),0) from mine),
 'streak',(select coalesce(max(streak),0) from streaks where last_day>=(now() at time zone 'Europe/Stockholm')::date-1),
 'best',(select coalesce(max(streak),0) from streaks),
 'distribution',(select jsonb_agg(n order by attempt) from (
 select attempt,count(m.attempts) as n from generate_series(1,7) attempt
 left join mine m on m.attempts=attempt and m.won group by attempt
 ) d)
 )
$$;
revoke all on function public.hardle_my_history() from public,anon;
revoke all on function public.hardle_my_game_stats(text) from public,anon;
grant execute on function public.hardle_my_history() to authenticated;
grant execute on function public.hardle_my_game_stats(text) to authenticated;
commit;
