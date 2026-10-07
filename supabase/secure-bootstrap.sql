-- Additional server functions. Run after anti-cheat.sql, validator-functions.sql,
-- and validator-permissions.sql. Does not activate client migration.
begin;
create or replace function hardle_private.ensure_puzzle(p_game text,p_secret jsonb,p_public jsonb)
returns boolean language plpgsql security definer set search_path=pg_catalog,hardle_private as $$
begin
 if p_game not in ('daily','artist','djdle','orderdle') or jsonb_typeof(p_secret)<>'object' or jsonb_typeof(p_public)<>'object' then raise exception 'Invalid puzzle';end if;
 insert into hardle_private.puzzles(puzzle_date,game,secret_solution,public_payload)
 values((now() at time zone 'Europe/Stockholm')::date,p_game,p_secret,p_public)
 on conflict(puzzle_date,game) do nothing;
 return true;
end; $$;
revoke all on function hardle_private.ensure_puzzle(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function hardle_private.ensure_puzzle(text,jsonb,jsonb) to hardle_validator;
commit;
