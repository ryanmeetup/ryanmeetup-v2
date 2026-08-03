alter table public.projects
add column links jsonb not null default '[]'::jsonb
check (jsonb_typeof(links) = 'array');
