-- Read-only checks. Run as database owner in Supabase SQL Editor.
select rolname, rolsuper, rolbypassrls
from pg_roles where rolname='hardle_validator';

select tablename, rowsecurity
from pg_tables where schemaname='hardle_private'
order by tablename;

select p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
 has_function_privilege('hardle_validator',p.oid,'EXECUTE') as validator_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='hardle_private' and p.proname in ('start_session','ensure_puzzle','take_rate_limit','previous_answers')
order by p.proname;

select tablename,
 has_table_privilege('anon',format('%I.%I',schemaname,tablename),'SELECT,INSERT,UPDATE,DELETE') as anon_has_table_access,
 has_table_privilege('authenticated',format('%I.%I',schemaname,tablename),'SELECT,INSERT,UPDATE,DELETE') as authenticated_has_table_access
from pg_tables where schemaname='hardle_private'
order by tablename;
