-- Allow admins to delete applications
create policy "applications_delete_admin"
  on public.applications for delete
  using (public.is_admin());
