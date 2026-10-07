-- Run after anti-cheat.sql. Server foundation only; games are not migrated yet.

-- Trusted server functions. Run after anti-cheat.sql. No grants to browser roles.
begin;
create or replace function hardle_private.take_rate_limit(p_key text,p_limit integer)
returns boolean language plpgsql security definer set search_path=pg_catalog,hardle_private as $$
declare n integer;
begin
 if p_limit<1 or p_limit>1000 or length(p_key)>200 then raise exception 'Invalid rate bucket'; end if;
 insert into hardle_private.rate_buckets(bucket_key,window_start,hits)
 values(p_key,date_trunc('minute',now()),1)
 on conflict(bucket_key,window_start) do update set hits=rate_buckets.hits+1 returning hits into n;
 return n<=p_limit;
end; $$;
create or replace function hardle_private.start_session(p_player text,p_game text)
returns table(session_id uuid, public_payload jsonb, guesses jsonb, completed boolean, result jsonb)
language plpgsql security definer set search_path=pg_catalog,hardle_private as $$
declare d date:=(now() at time zone 'Europe/Stockholm')::date; sid uuid;
begin
 if length(p_player)>120 or p_game not in ('daily','artist','djdle','orderdle') then raise exception 'Invalid session'; end if;
 if not exists(select 1 from hardle_private.puzzles p where p.puzzle_date=d and p.game=p_game) then raise exception 'Puzzle unavailable'; end if;
 insert into hardle_private.sessions(player_id,puzzle_date,game) values(p_player,d,p_game)
 on conflict(player_id,puzzle_date,game) do nothing;
 select s.id into sid from hardle_private.sessions s where s.player_id=p_player and s.puzzle_date=d and s.game=p_game;
 return query select s.id,p.public_payload,
 coalesce((select jsonb_agg(jsonb_build_object('guess',g.guess,'feedback',g.feedback,'attempt',g.attempt) order by g.attempt) from hardle_private.guesses g where g.session_id=s.id),'[]'::jsonb),s.completed,
 (select jsonb_build_object('score',r.score,'won',r.won,'attempts',r.attempts,'answer',p.secret_solution->'reveal') from hardle_private.results r where r.session_id=s.id)
 from hardle_private.sessions s join hardle_private.puzzles p on p.puzzle_date=s.puzzle_date and p.game=s.game where s.id=sid;
end; $$;
-- Only service backend may execute. Puzzle solutions still require trusted validator access.
revoke all on function hardle_private.take_rate_limit(text,integer) from public,anon,authenticated;
revoke all on function hardle_private.start_session(text,text) from public,anon,authenticated;
grant execute on function hardle_private.take_rate_limit(text,integer) to hardle_validator;
grant execute on function hardle_private.start_session(text,text) to hardle_validator;
commit;


-- Server-only database permissions. Requires anti-cheat.sql and validator-functions.sql.
-- Never share the hardle_validator password or expose these tables through REST.
begin;
grant usage on schema hardle_private to hardle_validator;
grant select on hardle_private.puzzles to hardle_validator;
grant select,update on hardle_private.sessions to hardle_validator;
grant select,insert on hardle_private.guesses to hardle_validator;
grant select,insert on hardle_private.results to hardle_validator;
grant insert on hardle_private.review_flags to hardle_validator;
grant usage on sequence hardle_private.review_flags_id_seq to hardle_validator;
-- SQL trusted code sets transaction-local player identity. Browser roles have no grants.
create policy validator_puzzle_read on hardle_private.puzzles for select to hardle_validator
 using (puzzle_date=(now() at time zone 'Europe/Stockholm')::date);
create policy validator_session_read on hardle_private.sessions for select to hardle_validator
 using (player_id=current_setting('hardle.player_id',true));
create policy validator_session_update on hardle_private.sessions for update to hardle_validator
 using (player_id=current_setting('hardle.player_id',true))
 with check (player_id=current_setting('hardle.player_id',true));
create policy validator_guess_read on hardle_private.guesses for select to hardle_validator
 using (exists(select 1 from hardle_private.sessions s where s.id=session_id and s.player_id=current_setting('hardle.player_id',true)));
create policy validator_guess_insert on hardle_private.guesses for insert to hardle_validator
 with check (exists(select 1 from hardle_private.sessions s where s.id=session_id and s.player_id=current_setting('hardle.player_id',true)));
create policy validator_result_read on hardle_private.results for select to hardle_validator
 using (player_id=current_setting('hardle.player_id',true));
create policy validator_result_insert on hardle_private.results for insert to hardle_validator
 with check (player_id=current_setting('hardle.player_id',true) and exists(select 1 from hardle_private.sessions s where s.id=session_id and s.player_id=current_setting('hardle.player_id',true) and s.completed));
create policy validator_review_insert on hardle_private.review_flags for insert to hardle_validator
 with check (exists(select 1 from hardle_private.sessions s where s.id=session_id and s.player_id=current_setting('hardle.player_id',true)));
commit;


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
