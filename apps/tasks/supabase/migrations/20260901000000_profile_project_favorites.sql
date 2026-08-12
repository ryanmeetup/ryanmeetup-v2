alter table public.profiles
add column favorite_project_ids uuid[] not null default '{}';

comment on column public.profiles.favorite_project_ids is
  'Project IDs favorited by this profile for personalized navigation and dashboard shortcuts.';
