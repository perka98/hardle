-- Temporary server-only test helpers. No browser-role access.
begin;
create or replace function hardle_private.create_concurrency_test()
returns table(player text) language plpgsql security definer
set search_path=pg_catalog,hardle_private as $$
declare id text:='guest:concurrency-test-'||gen_random_uuid()::text;
 d date:=(now() at time zone 'Europe/Stockholm')::date;
begin
 if not exists(select 1 from hardle_private.puzzles where puzzle_date=d and game='djdle') then raise exception 'Test puzzle required'; end if;
 insert into hardle_private.sessions(player_id,puzzle_date,game,started_at) values(id,d,'djdle',now()-interval '2 seconds');
 return query select id;
end; $$;
create or replace function hardle_private.cleanup_concurrency_test(p_player text)
returns void language plpgsql security definer set search_path=pg_catalog,hardle_private as $$
declare sid uuid;
begin
 if p_player is null or p_player !~ '^guest:concurrency-test-[0-9a-f-]{36}$' then raise exception 'Invalid test player'; end if;
 for sid in select id from hardle_private.sessions where player_id=p_player loop
 delete from hardle_private.review_flags where session_id=sid;
 delete from hardle_private.results where session_id=sid;
 delete from hardle_private.guesses where session_id=sid;
 delete from hardle_private.sessions where id=sid;
 end loop;
end; $$;
revoke all on function hardle_private.create_concurrency_test() from public,anon,authenticated;
revoke all on function hardle_private.cleanup_concurrency_test(text) from public,anon,authenticated;
grant execute on function hardle_private.create_concurrency_test() to hardle_validator;
grant execute on function hardle_private.cleanup_concurrency_test(text) to hardle_validator;
commit;
