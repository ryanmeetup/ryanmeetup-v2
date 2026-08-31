-- Retire the footer variant.
--
-- The footer used to be chosen from a preset -- 'branded', 'minimal', or
-- 'none' -- which made the Ryan Meetup footer one of three fixed shapes every
-- instance had to pick between. The footer is now composed from what the
-- instance actually stores: a subtitle, titled link sections, and socials. An
-- instance that sets none of them gets the minimal footer because there is
-- nothing to render, not because it selected a preset.
--
-- Nothing reads the column any more, so leaving it would keep a stale preset
-- in the row that no code consults and no settings form can edit. Dropping it
-- also drops its CHECK constraint.

alter table public.instance_settings
  drop column if exists footer_variant;
