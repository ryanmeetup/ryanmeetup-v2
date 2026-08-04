-- Direct Storage uploads are intentionally disabled. The authenticated API route
-- validates file signatures, then uses the service role to write accepted files.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain'
    ]
where id = 'task-attachments';

drop policy if exists "editors upload task files" on storage.objects;

alter table public.task_attachments
  add constraint task_attachments_size_limit
    check (size_bytes between 1 and 10485760) not valid,
  add constraint task_attachments_mime_allowlist
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain')) not valid;

create or replace function public.enforce_task_attachment_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attachment_project_id uuid;
  user_bytes bigint;
  project_bytes bigint;
begin
  if new.size_bytes is null or new.size_bytes < 1 or new.size_bytes > 10485760 then
    raise exception using errcode = '23514', message = 'Attachments must be between 1 byte and 10 MB';
  end if;
  if new.mime_type is null or new.mime_type not in (
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'
  ) then
    raise exception using errcode = '23514', message = 'Attachment MIME type is not allowed';
  end if;

  -- Serialize quota checks for this uploader and task to prevent concurrent bypass.
  perform pg_advisory_xact_lock(hashtextextended(new.created_by::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(new.task_id::text, 0));

  select project_id into attachment_project_id
  from public.tasks where id = new.task_id;

  select coalesce(sum(size_bytes), 0) into user_bytes
  from public.task_attachments where created_by = new.created_by;
  if user_bytes + new.size_bytes > 262144000 then
    raise exception using errcode = '23514', message = 'Attachment quota exceeded: 250 MB per user';
  end if;

  select coalesce(sum(a.size_bytes), 0) into project_bytes
  from public.task_attachments a
  join public.tasks t on t.id = a.task_id
  where t.project_id is not distinct from attachment_project_id;
  if project_bytes + new.size_bytes > 2147483648 then
    raise exception using errcode = '23514', message = 'Attachment quota exceeded: 2 GB per project';
  end if;
  return new;
end;
$$;

create trigger enforce_task_attachment_quota
before insert or update of size_bytes, created_by, task_id
on public.task_attachments
for each row execute function public.enforce_task_attachment_quota();

notify pgrst, 'reload schema';
