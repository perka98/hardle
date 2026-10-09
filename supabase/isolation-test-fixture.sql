-- Optional temporary test helper. Does not enable games.
-- Execute only from validator transaction and ROLLBACK that transaction afterwards.
begin;
create or replace function hardle_private.isolation_test_fixture()
returns table(player_a text,player_b text)
language plpgsql security definer set search_path=pg_catalog,hardle_private as $$
declare a text:='guest:test-a-'||gen_random_uuid()::text;
 b text:='guest:test-b-'||gen_random_uuid()::text;
begin
 insert into hardle_private.puzzles(puzzle_date,game,secret_solution,public_payload)
 values('1900-01-01','djdle','{}'::jsonb,'{}'::jsonb)
 on conflict(puzzle_date,game) do nothing;
 insert into hardle_private.sessions(player_id,puzzle_date,game)
 values(a,'1900-01-01','djdle'),(b,'1900-01-01','djdle');
 return query select a,b;
end; $$;
revoke all on function hardle_private.isolation_test_fixture() from public,anon,authenticated;
grant execute on function hardle_private.isolation_test_fixture() to hardle_validator;
commit;
-- Remove helper after verification:
-- drop function hardle_private.isolation_test_fixture();
