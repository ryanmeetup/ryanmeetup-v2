create policy "users read own avatar object"
on storage.objects for select
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
