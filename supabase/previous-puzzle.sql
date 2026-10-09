-- Run after launch-install.sql. Server-only previous-day answer lookup.
begin;
create or replace function hardle_private.previous_answers(p_game text)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,hardle_private as $$
declare answer jsonb;
begin
 if p_game is null or p_game not in ('daily','artist','djdle','orderdle') then
  raise exception 'Invalid game';
 end if;
 select secret_solution->'answer' into answer from hardle_private.puzzles
 where game=p_game and puzzle_date=(now() at time zone 'Europe/Stockholm')::date-1;
 if answer is null then return '[]'::jsonb; end if;
 if jsonb_typeof(answer)='array' then return answer; end if;
 return jsonb_build_array(answer);
end; $$;
revoke all on function hardle_private.previous_answers(text) from public,anon,authenticated;
grant execute on function hardle_private.previous_answers(text) to hardle_validator;
commit;
