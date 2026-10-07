-- Remove temporary diagnostic helpers only. Preserve all results and preview rounds.
begin;
drop function if exists hardle_private.isolation_test_fixture();
drop function if exists hardle_private.create_concurrency_test();
drop function if exists hardle_private.cleanup_concurrency_test(text);
commit;
