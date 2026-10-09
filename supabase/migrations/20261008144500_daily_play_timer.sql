alter table hardle_private.sessions
  add column if not exists play_started_at timestamptz;

create or replace function hardle_private.start_play(p_player text, p_game text)
returns timestamptz
language plpgsql
security definer
set search_path = 'pg_catalog', 'hardle_private'
as $function$
declare
  d date := (now() at time zone 'Europe/Stockholm')::date;
  started timestamptz;
begin
  if length(p_player)>120 or p_game not in ('daily','artist','djdle','orderdle') then
    raise exception 'Invalid session';
  end if;
  select s.play_started_at into started
  from hardle_private.sessions s
  where s.player_id=p_player and s.puzzle_date=d and s.game=p_game
  for update;
  if not found then raise exception 'Session required'; end if;
  if started is null then
    update hardle_private.sessions
      set play_started_at=now()
      where player_id=p_player and puzzle_date=d and game=p_game and completed=false
      returning play_started_at into started;
  end if;
  return started;
end;
$function$;

create or replace function hardle_private.start_session(p_player text, p_game text)
returns table(session_id uuid, public_payload jsonb, guesses jsonb, completed boolean, result jsonb)
language plpgsql
security definer
set search_path to 'pg_catalog', 'hardle_private'
as $function$
declare d date:=(now() at time zone 'Europe/Stockholm')::date; sid uuid;
begin
 if length(p_player)>120 or p_game not in ('daily','artist','djdle','orderdle') then raise exception 'Invalid session'; end if;
 if not exists(select 1 from hardle_private.puzzles p where p.puzzle_date=d and p.game=p_game) then raise exception 'Puzzle unavailable'; end if;
 insert into hardle_private.sessions(player_id,puzzle_date,game) values(p_player,d,p_game)
 on conflict(player_id,puzzle_date,game) do nothing;
 select s.id into sid from hardle_private.sessions s where s.player_id=p_player and s.puzzle_date=d and s.game=p_game;
 return query select s.id,
 coalesce(p.public_payload,'{}'::jsonb) || jsonb_build_object('playStartedAt',s.play_started_at),
 coalesce((select jsonb_agg(jsonb_build_object('guess',g.guess,'feedback',g.feedback,'attempt',g.attempt) order by g.attempt) from hardle_private.guesses g where g.session_id=s.id),'[]'::jsonb),s.completed,
 (select jsonb_build_object('score',r.score,'won',r.won,'attempts',r.attempts,'answer',p.secret_solution->'reveal') from hardle_private.results r where r.session_id=s.id);
end;
$function$;