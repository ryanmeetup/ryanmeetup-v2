update public.statuses
set is_default = true
where lower(trim(name)) = 'will not do';

notify pgrst, 'reload schema';

