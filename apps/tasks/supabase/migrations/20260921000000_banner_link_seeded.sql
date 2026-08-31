-- Give the banner somewhere to send people.
--
-- `banner_link_url` is one of the three settings where a stored NULL means
-- "this instance deliberately offers no link" rather than "inherit the
-- compiled default" -- an owner who empties the Link field in /admin/settings
-- is making a choice, and the resolver honors it. The trouble is that a row
-- created by saving some *other* setting looks identical: the instance-naming
-- flow writes `name` and leaves every other column NULL, so an instance that
-- never touched the banner silently opted out of the default feedback route
-- and shipped a notice inviting a bug report with nowhere to file it.
--
-- Two parts, matching the two ways a row gets a NULL:
--   1. Backfill the rows that already exist. Nobody chose NULL on these; an
--      instance that had pointed the link somewhere keeps what it set.
--   2. Default the column, so a row created by any future settings save
--      inherits the route instead of dropping it. An explicit NULL from the
--      settings form still stores NULL and still means "no link".
--
-- The address is the one compiled into `lib/instance.ts`: like the build
-- credit, it names whoever maintains this software rather than whoever the
-- workspace belongs to, so it holds for every deployment. The link now opens
-- a prefilled draft; that part is composed at render time in `lib/banner.ts`,
-- so what is stored here stays a plain address an owner can read and replace.

update public.instance_settings
   set banner_link_url = 'mailto:ryan@ryanmeetup.com'
 where banner_link_url is null;

alter table public.instance_settings
  alter column banner_link_url set default 'mailto:ryan@ryanmeetup.com';

-- The one stored message that predates all of this still routes feedback the
-- way 20260919000000 generalized away -- "create a task in the
-- tasks.ryanmeetup.com project and assign to Ryan Le" -- which is another
-- instance's arrangement written into this one's banner, and now contradicts
-- the email link beside it. Clearing it inherits the neutral default sentence;
-- any other message an owner wrote is left alone.
update public.instance_settings
   set banner_message = null
 where banner_message like '%create a task in the tasks.ryanmeetup.com%';
