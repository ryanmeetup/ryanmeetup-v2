-- URL attachments do not have a stored object, MIME type, or byte size. Keep
-- file validation and quota accounting for uploaded objects only.
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
  if new.file_path is null then
    if new.url !~* '^https?://' then
      raise exception using errcode = '23514', message = 'URL attachments must use HTTP or HTTPS';
    end if;
    if new.size_bytes is not null or new.mime_type is not null then
      raise exception using errcode = '23514', message = 'URL attachments cannot include file metadata';
    end if;
    return new;
  end if;

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

notify pgrst, 'reload schema';
