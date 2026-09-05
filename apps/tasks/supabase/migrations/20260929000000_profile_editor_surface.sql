-- Per-person choice of editor surface.
--
-- Every create/edit flow now exists twice: as a dialog over the page you were
-- on, and as a dedicated route. Until now the choice was made entirely in CSS
-- — a dialog from `sm` up, a page below it — which is the right default but
-- the wrong answer for someone who wants one shape everywhere. `auto` keeps
-- the breakpoint; `modal` and `page` pin the surface at every width.
--
-- The baseline carries the same column for a build from empty.

alter table public.profiles
  add column if not exists editor_surface text not null default 'auto';

alter table public.profiles
  drop constraint if exists profiles_editor_surface_check,
  add constraint profiles_editor_surface_check
    check (editor_surface in ('auto', 'modal', 'page'));

comment on column public.profiles.editor_surface is
  'Where create and edit forms open for this profile: auto (dialog from the sm breakpoint up, page below it), modal, or page.';
