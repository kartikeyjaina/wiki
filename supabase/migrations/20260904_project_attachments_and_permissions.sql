-- Complete project ownership and private attachment storage without changing existing rows.
alter table public.projects enable row level security;
drop policy if exists "admins can manage projects" on public.projects;
create policy "members can read projects" on public.projects for select to authenticated using (true);
create policy "members can create owned projects" on public.projects for insert to authenticated with check (owner_id = auth.uid() or public.is_admin());
create policy "owners can update projects" on public.projects for update to authenticated using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "admins can delete projects" on public.projects for delete to authenticated using (public.is_admin());

drop policy if exists "admins can manage project todos" on public.project_todos;
create policy "project collaborators manage todos" on public.project_todos for all to authenticated
using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager'))))
with check (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager'))));

create table if not exists public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  description text,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists project_attachments_project_idx on public.project_attachments(project_id, created_at desc);
alter table public.project_attachments enable row level security;
create policy "project collaborators read attachments" on public.project_attachments for select to authenticated using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()))));
create policy "project collaborators manage attachments" on public.project_attachments for all to authenticated using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager')))) with check (uploaded_by = auth.uid() and (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager')))));

drop policy if exists "members can read project attachments" on storage.objects;
create policy "project collaborators read attachments" on storage.objects for select to authenticated using (bucket_id = 'brand-assets' and exists (select 1 from public.project_attachments a join public.projects p on p.id = a.project_id where a.storage_path = name and (public.is_admin() or p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()))));
drop policy if exists "project managers upload attachments" on storage.objects;
create policy "project managers upload attachments" on storage.objects for insert to authenticated with check (bucket_id = 'brand-assets' and exists (select 1 from public.projects p where name like 'projects/' || p.id::text || '/%' and (public.is_admin() or p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager'))));