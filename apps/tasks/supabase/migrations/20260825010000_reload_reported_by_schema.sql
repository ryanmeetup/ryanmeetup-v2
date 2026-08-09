-- Ensure every PostgREST instance sees the reported_by column and updated
-- save_task function immediately after the preceding migration.
notify pgrst, 'reload schema';
