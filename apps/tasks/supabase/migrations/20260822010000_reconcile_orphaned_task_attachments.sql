create or replace function public.list_orphaned_task_attachment_paths()
returns table(path text)
language sql
security definer
set search_path = ''
as $$
  select objects.name
  from storage.objects as objects
  where objects.bucket_id = 'task-attachments'
    and objects.created_at < now() - interval '24 hours'
    and not exists (
      select 1
      from public.task_attachments as attachments
      where attachments.file_path = objects.name
    )
  order by objects.created_at
  limit 500;
$$;

revoke all on function public.list_orphaned_task_attachment_paths() from public;
revoke all on function public.list_orphaned_task_attachment_paths() from anon;
revoke all on function public.list_orphaned_task_attachment_paths() from authenticated;
grant execute on function public.list_orphaned_task_attachment_paths() to service_role;
