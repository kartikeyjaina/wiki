-- Project participants need to be able to read the roster shown by the UI.
drop policy if exists "project members read memberships" on public.project_members;
create policy "project members read memberships" on public.project_members
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.projects p
    where p.id = project_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.project_members viewer_membership
          where viewer_membership.project_id = p.id
            and viewer_membership.user_id = auth.uid()
        )
      )
  )
);