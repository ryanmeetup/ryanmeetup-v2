alter table public.profiles
  add column task_details_open_by_default boolean not null default false;

notify pgrst, 'reload schema';
