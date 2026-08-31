alter table public.contacts
  add column if not exists image_path text;

comment on column public.contacts.image_path is
  'Server-owned path in the organization-images bucket. External images remain in image_url.';

update public.contacts
set
  image_path = substring(
    image_url from '/storage/v1/object/public/organization-images/(.+)$'
  ),
  image_url = null
where image_path is null
  and image_url like '%/storage/v1/object/public/organization-images/%';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contacts'::regclass
      and conname = 'contacts_image_path_check'
  ) then
    alter table public.contacts
      add constraint contacts_image_path_check
      check (image_path is null or char_length(image_path) <= 512);
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contacts'::regclass
      and conname = 'contacts_image_source_check'
  ) then
    alter table public.contacts
      add constraint contacts_image_source_check
      check (image_path is null or image_url is null);
  end if;
end
$$;
