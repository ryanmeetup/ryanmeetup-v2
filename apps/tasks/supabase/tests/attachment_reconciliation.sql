begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

select has_function(
  'public',
  'list_orphaned_task_attachment_paths',
  array[]::text[],
  'orphan reconciliation query is installed'
);
select is(
  (
    select pg_get_function_result(procedure.oid)
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'list_orphaned_task_attachment_paths'
  ),
  'TABLE(path text)',
  'orphan reconciliation returns Storage paths'
);
select is(
  has_function_privilege('authenticated', 'public.list_orphaned_task_attachment_paths()', 'execute'),
  false,
  'authenticated clients cannot enumerate orphaned objects'
);

select * from finish();
rollback;
