-- Task inserts run as the authenticated caller. PostgreSQL checks sequence
-- privileges separately from table privileges, so task creation cannot use
-- the task_number default unless the API role can advance this sequence.
grant usage, select on sequence public.task_number_seq to authenticated;

notify pgrst, 'reload schema';
