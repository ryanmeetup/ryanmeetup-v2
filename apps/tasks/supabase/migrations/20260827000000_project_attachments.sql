create table public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('note', 'file')),
  name text not null check (char_length(trim(name)) between 1 and 200),
  body text,
  url text not null default '',
  file_path text,
  mime_type text,
  size_bytes bigint,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint project_attachment_shape check (
    (kind = 'note' and body is not null and char_length(trim(body)) between 1 and 10000
      and file_path is null and mime_type is null and size_bytes is null)
    or
    (kind = 'file' and body is null and file_path is not null
      and mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain')
      and size_bytes between 1 and 10485760)
  )
);

create index project_attachments_project_idx
on public.project_attachments(project_id, created_at);

alter table public.project_attachments enable row level security;

create policy "members view project attachments"
on public.project_attachments for select
using (public.can_view_project(project_id));

create policy "editors create project attachments"
on public.project_attachments for insert
with check (public.can_edit_project(project_id) and created_by = auth.uid());

create policy "editors delete project attachments"
on public.project_attachments for delete
using (public.can_edit_project(project_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-attachments',
  'project-attachments',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.project_id_from_storage_path(object_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
declare candidate text;
begin
  candidate := (storage.foldername(object_name))[1];
  if candidate is null or candidate !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return candidate::uuid;
end;
$$;

create policy "members read project files"
on storage.objects for select
using (
  bucket_id = 'project-attachments'
  and public.can_view_project(public.project_id_from_storage_path(name))
);

create policy "editors delete project files"
on storage.objects for delete
using (
  bucket_id = 'project-attachments'
  and public.can_edit_project(public.project_id_from_storage_path(name))
);

alter publication supabase_realtime add table public.project_attachments;

notify pgrst, 'reload schema';
