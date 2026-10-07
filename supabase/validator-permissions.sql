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
drop policy if exists validator_puzzle_read on hardle_private.puzzles;
create policy validator_puzzle_read on hardle_private.puzzles for select to hardle_validator
 using (puzzle_date=(now() at time zone 'Europe/Stockholm')::date);
drop policy if exists validator_session_read on hardle_private.sessions;
create policy validator_session_read on hardle_private.sessions for select to hardle_validator
 using (player_id=current_setting('hardle.player_id',true));
drop policy if exists validator_session_update on hardle_private.sessions;
create policy validator_session_update on hardle_private.sessions for update to hardle_validator
 using (player_id=current_setting('hardle.player_id',true))
 with check (player_id=current_setting('hardle.player_id',true));
drop policy if exists validator_guess_read on hardle_private.guesses;
create policy validator_guess_read on hardle_private.guesses for select to hardle_validator
 using (exists(select 1 from hardle_private.sessions s where s.id=session_id and s.player_id=current_setting('hardle.player_id',true)));
drop policy if exists validator_guess_insert on hardle_private.guesses;
create policy validator_guess_insert on hardle_private.guesses for insert to hardle_validator
 with check (exists(select 1 from hardle_private.sessions s where s.id=session_id and s.player_id=current_setting('hardle.player_id',true)));
drop policy if exists validator_result_read on hardle_private.results;
create policy validator_result_read on hardle_private.results for select to hardle_validator
 using (player_id=current_setting('hardle.player_id',true));
drop policy if exists validator_result_insert on hardle_private.results;
create policy validator_result_insert on hardle_private.results for insert to hardle_validator
 with check (player_id=current_setting('hardle.player_id',true) and exists(select 1 from hardle_private.sessions s where s.id=session_id and s.player_id=current_setting('hardle.player_id',true) and s.completed));
drop policy if exists validator_review_insert on hardle_private.review_flags;
create policy validator_review_insert on hardle_private.review_flags for insert to hardle_validator
 with check (exists(select 1 from hardle_private.sessions s where s.id=session_id and s.player_id=current_setting('hardle.player_id',true)));
commit;
