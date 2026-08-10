-- Give access groups a required visual identity used throughout access management.

alter table public.access_groups
  add column color text;

with ranked_groups as (
  select
    id,
    row_number() over (order by created_at, id) as position
  from public.access_groups
), palette(color, position) as (
  values
    ('#2563eb', 1),
    ('#7c3aed', 2),
    ('#db2777', 3),
    ('#dc2626', 4),
    ('#ea580c', 5),
    ('#d97706', 6),
    ('#16a34a', 7),
    ('#0d9488', 8)
)
update public.access_groups as access_group
set color = palette.color
from ranked_groups
join palette
  on palette.position = ((ranked_groups.position - 1) % 8) + 1
where access_group.id = ranked_groups.id;

alter table public.access_groups
  alter column color set default '#2563eb',
  alter column color set not null,
  add constraint access_groups_color_hex
    check (color ~ '^#[0-9a-fA-F]{6}$');
