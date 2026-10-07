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
