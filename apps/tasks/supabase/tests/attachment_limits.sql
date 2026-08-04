begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select is((select file_size_limit from storage.buckets where id = 'task-attachments'), 10485760::bigint, 'bucket rejects files larger than 10 MB');
select is((select allowed_mime_types from storage.buckets where id = 'task-attachments'), array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'], 'bucket has an attachment MIME allowlist');
select is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'editors upload task files'), 0::bigint, 'authenticated users cannot upload directly to Storage');
select col_has_check('public', 'task_attachments', 'size_bytes', 'attachment rows have a size constraint');
select col_has_check('public', 'task_attachments', 'mime_type', 'attachment rows have a MIME constraint');
select has_trigger('public', 'task_attachments', 'enforce_task_attachment_quota', 'attachment inserts enforce quotas');
select function_returns('public', 'enforce_task_attachment_quota', 'trigger', 'quota trigger function is installed');

select * from finish();
rollback;
