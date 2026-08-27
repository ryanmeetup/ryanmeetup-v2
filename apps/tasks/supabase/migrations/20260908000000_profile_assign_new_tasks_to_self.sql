-- Per-person default assignee for new tasks.
--
-- Someone who works mostly out of their own queue was re-selecting themselves
-- in the assignee field on every task they opened. This preference makes the
-- new-task draft start assigned to them; an explicitly filtered assignee still
-- wins, and the field stays editable.
--
-- The baseline carries the same column for a build from empty.

alter table public.profiles
  add column if not exists assign_new_tasks_to_self boolean not null default false;

comment on column public.profiles.assign_new_tasks_to_self is
  'When true, a new task drafted by this profile starts assigned to them.';
