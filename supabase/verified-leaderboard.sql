-- Run after leaderboard.sql and anti-cheat.sql. Does not import local/browser scores.
begin;
create or replace function public.hardle_leaderboard(period text)
returns table(username text,score bigint)
language sql stable security definer set search_path=pg_catalog as $$
 select p.username,sum(r.score)::bigint
 from public.hardle_profiles p
 join hardle_private.results r on r.user_id=p.user_id
 where period in ('daily','total')
 and (period='total' or r.puzzle_date=(now() at time zone 'Europe/Stockholm')::date)
 group by p.user_id,p.username
 order by sum(r.score) desc,p.username asc limit 100
$$;
revoke all on function public.hardle_leaderboard(text) from public;
grant execute on function public.hardle_leaderboard(text) to anon,authenticated;

-- Verified auth identity only. Username uniqueness remains database-enforced.
create or replace function public.hardle_register_profile(p_username text)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_username is null or p_username !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'Invalid username'; end if;
 insert into public.hardle_profiles(user_id,username) values(uid,p_username)
 on conflict(user_id) do nothing;
end; $$;
revoke all on function public.hardle_register_profile(text) from public,anon;
grant execute on function public.hardle_register_profile(text) to authenticated;
revoke all on public.hardle_profiles,public.hardle_verified_results from anon,authenticated;
commit;
