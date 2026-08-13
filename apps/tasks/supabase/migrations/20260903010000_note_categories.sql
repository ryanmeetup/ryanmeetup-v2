alter table public.notes
  add column category_id uuid references public.work_groups(id) on delete set null;

create index notes_category_id_idx on public.notes(category_id);

drop policy "members read notes" on public.notes;
drop policy "members create notes" on public.notes;
drop policy "members update notes" on public.notes;
drop policy "members delete notes" on public.notes;

create policy "members read notes"
on public.notes for select
using (
  public.is_team_member()
  and (category_id is null or public.can_access_category(category_id))
);

create policy "members create notes"
on public.notes for insert
with check (
  public.is_team_member()
  and created_by = auth.uid()
  and converted_task_id is null
  and (category_id is null or public.can_access_category(category_id))
);

create policy "members update notes"
on public.notes for update
using (
  public.is_team_member()
  and (category_id is null or public.can_access_category(category_id))
)
with check (
  public.is_team_member()
  and (category_id is null or public.can_access_category(category_id))
);

create policy "members delete notes"
on public.notes for delete
using (
  public.is_team_member()
  and (category_id is null or public.can_access_category(category_id))
);
