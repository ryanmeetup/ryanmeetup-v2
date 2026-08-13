alter table public.work_groups
  add column access_mode text not null default 'open'
  constraint work_groups_access_mode_check
  check (access_mode in ('open', 'restricted'));

update public.work_groups category
set access_mode = 'restricted'
where exists (
  select 1 from public.category_group_grants grant_row
  where grant_row.category_id = category.id
);

create or replace function public.can_manage_categories()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_global_content_access(auth.uid());
$$;

create or replace function public.can_access_category(requested_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_global_content_access(auth.uid())
    or exists (
      select 1
      from public.work_groups category
      where category.id = requested_category_id
        and (
          category.access_mode = 'open'
          or exists (
            select 1
            from public.category_group_grants grant_row
            where grant_row.category_id = category.id
              and public.member_has_group_access(auth.uid(), grant_row.group_id)
          )
        )
    );
$$;

drop policy if exists "team reads groups" on public.work_groups;
create policy "members read accessible categories"
on public.work_groups for select
using (public.can_access_category(id));

drop policy if exists "owners manage categories" on public.work_groups;
create policy "r suite manages category content"
on public.work_groups for all
using (public.can_manage_categories())
with check (public.can_manage_categories());

drop policy if exists "owners create category attachments"
on public.category_attachments;
create policy "r suite creates category attachments"
on public.category_attachments for insert
with check (public.can_manage_categories() and created_by = auth.uid());

drop policy if exists "owners delete category attachments"
on public.category_attachments;
create policy "r suite deletes category attachments"
on public.category_attachments for delete
using (public.can_manage_categories());

drop policy if exists "owners upload category files" on storage.objects;
create policy "r suite uploads category files"
on storage.objects for insert
with check (
  bucket_id = 'category-attachments'
  and public.can_manage_categories()
);

drop policy if exists "owners delete category files" on storage.objects;
create policy "r suite deletes category files"
on storage.objects for delete
using (
  bucket_id = 'category-attachments'
  and public.can_manage_categories()
);

grant execute on function public.can_manage_categories() to authenticated;
notify pgrst, 'reload schema';
