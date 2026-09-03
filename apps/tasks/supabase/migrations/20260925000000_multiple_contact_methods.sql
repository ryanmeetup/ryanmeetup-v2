-- Keep the original scalar/array columns as a compatibility projection while
-- the app moves to labeled, repeatable contact methods. Existing values are
-- promoted without losing data, and the original save RPC remains usable by
-- an older deployment during a rolling release.
alter table public.contact_people
  add column if not exists email_methods jsonb not null default '[]'::jsonb,
  add column if not exists phone_methods jsonb not null default '[]'::jsonb;

update public.contact_people
set email_methods = coalesce(
  (
    select jsonb_agg(jsonb_build_object('label', null, 'value', email))
    from unnest(emails) email
  ),
  '[]'::jsonb
)
where email_methods = '[]'::jsonb and cardinality(emails) > 0;

update public.contact_people
set phone_methods = jsonb_build_array(
  jsonb_build_object('label', null, 'value', phone)
)
where phone_methods = '[]'::jsonb and phone is not null;

alter table public.contact_people
  drop constraint if exists contact_people_email_methods_check,
  add constraint contact_people_email_methods_check check (
    jsonb_typeof(email_methods) = 'array' and jsonb_array_length(email_methods) <= 10
  ),
  drop constraint if exists contact_people_phone_methods_check,
  add constraint contact_people_phone_methods_check check (
    jsonb_typeof(phone_methods) = 'array' and jsonb_array_length(phone_methods) <= 10
  );

create or replace function public.save_contact_with_methods(
  contact_id uuid,
  contact_is_new boolean,
  contact_name text,
  contact_notes text,
  contact_image_url text,
  contact_image_path text,
  retain_contact_image boolean,
  contact_group_name text,
  category_ids uuid[],
  new_category_names text[],
  people jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  person jsonb;
  method jsonb;
  person_id uuid;
  normalized_people jsonb := '[]'::jsonb;
  legacy_people jsonb := '[]'::jsonb;
  saved_contact jsonb;
  saved_id uuid;
begin
  if jsonb_typeof(people) <> 'array' or jsonb_array_length(people) > 100 then
    raise exception 'Invalid people';
  end if;

  for person in select value from jsonb_array_elements(people) loop
    if jsonb_typeof(coalesce(person->'emails', '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(person->'emails', '[]'::jsonb)) > 10
      or jsonb_typeof(coalesce(person->'phones', '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(person->'phones', '[]'::jsonb)) > 10 then
      raise exception 'Invalid contact methods';
    end if;

    for method in
      select value
      from jsonb_array_elements(
        coalesce(person->'emails', '[]'::jsonb)
        || coalesce(person->'phones', '[]'::jsonb)
      )
    loop
      if jsonb_typeof(method) <> 'object'
        or nullif(btrim(method->>'value'), '') is null
        or char_length(btrim(method->>'value')) > 254
        or char_length(btrim(method->>'label')) > 40 then
        raise exception 'Invalid contact method';
      end if;
    end loop;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(person->'phones', '[]'::jsonb)) phone_method
      where char_length(btrim(phone_method->>'value')) > 40
    ) or exists (
      select 1
      from jsonb_array_elements(coalesce(person->'emails', '[]'::jsonb)) email_method
      where btrim(email_method->>'value') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) then
      raise exception 'Invalid contact method';
    end if;

    person_id := coalesce(nullif(person->>'id', '')::uuid, gen_random_uuid());
    person := jsonb_set(person, '{id}', to_jsonb(person_id::text));
    normalized_people := normalized_people || jsonb_build_array(person);
    legacy_people := legacy_people || jsonb_build_array(
      (person - 'phones') || jsonb_build_object(
        'emails', coalesce((
          select jsonb_agg(lower(btrim(method->>'value')))
          from jsonb_array_elements(coalesce(person->'emails', '[]'::jsonb)) method
        ), '[]'::jsonb),
        'phone', nullif(btrim(person->'phones'->0->>'value'), '')
      )
    );
  end loop;

  saved_contact := public.save_contact_with_activity(
    contact_id,
    contact_is_new,
    contact_name,
    contact_notes,
    contact_image_url,
    contact_image_path,
    retain_contact_image,
    contact_group_name,
    category_ids,
    new_category_names,
    legacy_people
  );
  saved_id := (saved_contact->>'id')::uuid;

  for person in select value from jsonb_array_elements(normalized_people) loop
    update public.contact_people
    set
      email_methods = coalesce(person->'emails', '[]'::jsonb),
      phone_methods = coalesce(person->'phones', '[]'::jsonb)
    where id = (person->>'id')::uuid and contact_id = saved_id;
  end loop;

  return jsonb_set(
    saved_contact,
    '{people}',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', contact_person.id,
          'full_name', contact_person.full_name,
          'title', contact_person.title,
          'emails', contact_person.email_methods,
          'phones', contact_person.phone_methods,
          'instagram_handle', contact_person.instagram_handle
        )
        order by contact_person.full_name
      )
      from public.contact_people contact_person
      where contact_person.contact_id = saved_id
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.save_contact_with_methods(uuid,boolean,text,text,text,text,boolean,text,uuid[],text[],jsonb) from public;
grant execute on function public.save_contact_with_methods(uuid,boolean,text,text,text,text,boolean,text,uuid[],text[],jsonb) to authenticated, service_role;
