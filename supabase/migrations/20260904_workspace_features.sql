-- Workspace features migration. Safe to run after the base schema.
alter table public.projects add column if not exists owner_id uuid references public.profiles(id) on delete set null;
alter table public.projects add column if not exists due_date date;
alter table public.projects add column if not exists priority text not null default 'medium';
alter table public.projects add constraint projects_priority_valid check (priority in ('low', 'medium', 'high', 'urgent'));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, title text not null, body text, entity_type public.entity_type, entity_id uuid, href text,
  read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id) where read_at is null;

create table if not exists public.entity_follows (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type public.entity_type not null, entity_id uuid not null, created_at timestamptz not null default now(),
  unique(user_id, entity_type, entity_id)
);
create index if not exists entity_follows_entity_idx on public.entity_follows(entity_type, entity_id);

create table if not exists public.user_asset_saves (
  user_id uuid not null references public.profiles(id) on delete cascade, asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id, asset_id)
);

create table if not exists public.recently_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade, entity_type public.entity_type not null,
  entity_id uuid not null, last_viewed_at timestamptz not null default now(), primary key(user_id, entity_type, entity_id)
);
create index if not exists recently_viewed_user_idx on public.recently_viewed(user_id, last_viewed_at desc);

create table if not exists public.comment_mentions (
  comment_id uuid not null references public.comments(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(comment_id, user_id)
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'manager')), created_at timestamptz not null default now(), primary key(project_id, user_id)
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0), description text, display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')), due_date date, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists project_milestones_project_idx on public.project_milestones(project_id, display_order);

create or replace function public.entity_relationship_details(entity_type_input public.entity_type, entity_id_input uuid)
returns table(id uuid, from_type public.entity_type, from_id uuid, to_type public.entity_type, to_id uuid, relationship_type text, title text, href text)
language sql stable security invoker
as $$
  with related as (
    select r.id, r.from_type, r.from_id, r.to_type, r.to_id, r.relationship_type from public.entity_relationships r where r.from_type = entity_type_input and r.from_id = entity_id_input
    union all
    select r.id, r.from_type, r.from_id, r.to_type, r.to_id, r.relationship_type from public.entity_relationships r where r.to_type = entity_type_input and r.to_id = entity_id_input
  )
  select related.id, related.from_type, related.from_id, related.to_type, related.to_id, related.relationship_type,
    case when related.from_type = entity_type_input and related.from_id = entity_id_input then
      case related.to_type when 'asset' then (select a.name from public.assets a where a.id = related.to_id) when 'idea' then (select i.title from public.ideas i where i.id = related.to_id) when 'project' then (select p.title from public.projects p where p.id = related.to_id) when 'wiki_page' then (select w.title from public.wiki_pages w where w.id = related.to_id) when 'person' then (select coalesce(p.display_name, 'Profile') from public.profiles p where p.id = related.to_id) else 'Related record' end
    else case related.from_type when 'asset' then (select a.name from public.assets a where a.id = related.from_id) when 'idea' then (select i.title from public.ideas i where i.id = related.from_id) when 'project' then (select p.title from public.projects p where p.id = related.from_id) when 'wiki_page' then (select w.title from public.wiki_pages w where w.id = related.from_id) when 'person' then (select coalesce(p.display_name, 'Profile') from public.profiles p where p.id = related.from_id) else 'Related record' end end,
    case when related.from_type = entity_type_input and related.from_id = entity_id_input then '/' || related.to_type::text || 's/' || related.to_id::text else '/' || related.from_type::text || 's/' || related.from_id::text end
  from related;
$$;

alter table public.notifications enable row level security;
alter table public.entity_follows enable row level security;
alter table public.user_asset_saves enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.comment_mentions enable row level security;
alter table public.project_members enable row level security;
alter table public.project_milestones enable row level security;

create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own follows" on public.entity_follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own saved assets" on public.user_asset_saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own recent views" on public.recently_viewed for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users read mentions" on public.comment_mentions for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.comments c where c.id = comment_id and c.author_id = auth.uid()));
create policy "users create mentions" on public.comment_mentions for insert to authenticated with check (exists (select 1 from public.comments c where c.id = comment_id and c.author_id = auth.uid()));
create policy "project members read memberships" on public.project_members for select to authenticated using (user_id = auth.uid() or public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "project owners manage memberships" on public.project_members for all to authenticated using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())) with check (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "members read project milestones" on public.project_milestones for select to authenticated using (true);
create policy "project managers manage milestones" on public.project_milestones for all to authenticated using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager')))) with check (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager'))));
