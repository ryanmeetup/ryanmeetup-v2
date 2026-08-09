drop policy if exists "task access controls comments" on public.task_comments;

create policy "task access controls comment creation"
on public.task_comments for insert
with check (
  public.can_edit_task(task_id)
  and created_by = auth.uid()
);

create policy "comment authors update comments"
on public.task_comments for update
using (
  public.can_edit_task(task_id)
  and created_by = auth.uid()
)
with check (
  public.can_edit_task(task_id)
  and created_by = auth.uid()
);

create policy "comment authors delete comments"
on public.task_comments for delete
using (
  public.can_edit_task(task_id)
  and created_by = auth.uid()
);
