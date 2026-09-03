create extension if not exists pgcrypto;

create type public.app_role as enum ('member', 'admin');
create type public.idea_status as enum ('new', 'discussing', 'under_review', 'planned', 'in_progress', 'shipped', 'parked', 'declined', 'duplicate');
create type public.asset_status as enum ('approved', 'current', 'draft', 'deprecated', 'template');
create type public.entity_type as enum ('wiki_page', 'asset', 'idea', 'comment', 'project', 'person');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role app_role not null default 'member',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'member'
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.wiki_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  author_id uuid references public.profiles(id) on delete set null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wiki_page_revisions (
  id uuid primary key default gen_random_uuid(),
  wiki_page_id uuid not null references public.wiki_pages(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.asset_collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.asset_collections(id) on delete set null,
  name text not null,
  category text,
  asset_type text not null,
  status asset_status not null default 'draft',
  preview_url text,
  storage_path text,
  metadata jsonb,
  owner_id uuid references public.profiles(id) on delete set null,
  version text,
  last_reviewed_at timestamptz,
  source_url text,
  usage_guidance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  version text not null,
  storage_path text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.asset_tags (
  asset_id uuid not null references public.assets(id) on delete cascade,
  tag text not null,
  primary key (asset_id, tag)
);

create table public.idea_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  why_it_matters text,
  category_id uuid references public.idea_categories(id) on delete set null,
  raw_category text,
  optional_links text,
  status idea_status not null default 'new',
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idea_title_min check (char_length(trim(title)) >= 8),
  constraint idea_description_min check (char_length(trim(description)) >= 24)
);

create table public.idea_votes (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type entity_type not null,
  entity_id uuid not null,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'planned',
  originating_idea_id uuid references public.ideas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  entity_type entity_type not null,
  entity_id uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type entity_type not null,
  source_id uuid not null,
  rule_key text not null,
  points integer not null,
  created_at timestamptz not null default now()
);

create table public.entity_relationships (
  id uuid primary key default gen_random_uuid(),
  from_type entity_type not null,
  from_id uuid not null,
  to_type entity_type not null,
  to_id uuid not null,
  relationship_type text not null default 'related',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (from_type, from_id, to_type, to_id, relationship_type)
);

create index ideas_status_idx on public.ideas(status);
create index ideas_created_at_idx on public.ideas(created_at desc);
create index idea_votes_idea_id_idx on public.idea_votes(idea_id);
create index comments_entity_idx on public.comments(entity_type, entity_id);
create index activity_entity_idx on public.activity_events(entity_type, entity_id, created_at desc);
create index assets_category_idx on public.assets(category);
create index assets_status_idx on public.assets(status);

create or replace view public.idea_feed as
select
  i.*,
  coalesce(sum(v.value), 0)::integer as score,
  count(distinct c.id)::integer as comment_count,
  jsonb_build_object('id', p.id, 'display_name', p.display_name, 'role', p.role, 'avatar_url', p.avatar_url) as author,
  case when ic.id is null then null else jsonb_build_object('id', ic.id, 'name', ic.name) end as category
from public.ideas i
left join public.idea_votes v on v.idea_id = i.id
left join public.comments c on c.entity_type = 'idea' and c.entity_id = i.id
left join public.profiles p on p.id = i.author_id
left join public.idea_categories ic on ic.id = i.category_id
group by i.id, p.id, ic.id;

create or replace function public.global_search(search_query text, type_filter text default null)
returns table(id uuid, type entity_type, title text, excerpt text, href text)
language sql
stable
as $$
  select w.id, 'wiki_page'::entity_type, w.title, left(w.content, 180), '/brand'
  from public.wiki_pages w
  where (type_filter is null or type_filter = 'wiki') and w.title ilike '%' || search_query || '%'
  union all
  select a.id, 'asset'::entity_type, a.name, a.category, '/assets/' || a.id::text
  from public.assets a
  where (type_filter is null or type_filter = 'assets') and a.name ilike '%' || search_query || '%'
  union all
  select i.id, 'idea'::entity_type, i.title, left(i.description, 180), '/ideas/' || i.id::text
  from public.ideas i
  where (type_filter is null or type_filter = 'ideas') and i.title ilike '%' || search_query || '%'
  union all
  select p.id, 'person'::entity_type, coalesce(p.display_name, 'Profile'), p.role::text, '/people/' || p.id::text
  from public.profiles p
  where (type_filter is null or type_filter = 'people') and coalesce(p.display_name, '') ilike '%' || search_query || '%'
  limit 30;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.wiki_pages enable row level security;
alter table public.wiki_page_revisions enable row level security;
alter table public.asset_collections enable row level security;
alter table public.assets enable row level security;
alter table public.asset_versions enable row level security;
alter table public.asset_tags enable row level security;
alter table public.idea_categories enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.comments enable row level security;
alter table public.projects enable row level security;
alter table public.activity_events enable row level security;
alter table public.reputation_events enable row level security;
alter table public.entity_relationships enable row level security;

create policy "members can read profiles" on public.profiles for select to authenticated using (true);
create policy "users can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members can read wiki" on public.wiki_pages for select to authenticated using (true);
create policy "admins can manage wiki" on public.wiki_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read wiki revisions" on public.wiki_page_revisions for select to authenticated using (true);
create policy "admins can manage wiki revisions" on public.wiki_page_revisions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members can read assets" on public.assets for select to authenticated using (true);
create policy "admins can manage assets" on public.assets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read asset collections" on public.asset_collections for select to authenticated using (true);
create policy "admins can manage asset collections" on public.asset_collections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read asset versions" on public.asset_versions for select to authenticated using (true);
create policy "admins can manage asset versions" on public.asset_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read asset tags" on public.asset_tags for select to authenticated using (true);
create policy "admins can manage asset tags" on public.asset_tags for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members can read idea categories" on public.idea_categories for select to authenticated using (true);
create policy "admins can manage idea categories" on public.idea_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read ideas" on public.ideas for select to authenticated using (true);
create policy "members can create ideas" on public.ideas for insert to authenticated with check (author_id = auth.uid());
create policy "authors can update own ideas" on public.ideas for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "admins can moderate ideas" on public.ideas for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members can read votes" on public.idea_votes for select to authenticated using (true);
create policy "members can vote as themselves" on public.idea_votes for insert to authenticated with check (user_id = auth.uid());
create policy "members can change own votes" on public.idea_votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members can remove own votes" on public.idea_votes for delete to authenticated using (user_id = auth.uid());

create policy "members can read comments" on public.comments for select to authenticated using (true);
create policy "members can create comments" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "authors can update own comments" on public.comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors can delete own comments" on public.comments for delete to authenticated using (author_id = auth.uid());

create policy "members can read projects" on public.projects for select to authenticated using (true);
create policy "admins can manage projects" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read activity" on public.activity_events for select to authenticated using (true);
create policy "members can record own activity" on public.activity_events for insert to authenticated with check (actor_id = auth.uid());
create policy "admins can manage activity" on public.activity_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read reputation" on public.reputation_events for select to authenticated using (true);
create policy "admins can manage reputation" on public.reputation_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read relationships" on public.entity_relationships for select to authenticated using (true);
create policy "admins can manage relationships" on public.entity_relationships for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', false)
on conflict (id) do nothing;

drop policy if exists "members can read brand assets" on storage.objects;
create policy "members can read brand assets" on storage.objects
for select to authenticated
using (bucket_id = 'brand-assets');

drop policy if exists "admins can upload brand assets" on storage.objects;
create policy "admins can upload brand assets" on storage.objects
for insert to authenticated
with check (bucket_id = 'brand-assets' and public.is_admin());

drop policy if exists "admins can update brand assets" on storage.objects;
create policy "admins can update brand assets" on storage.objects
for update to authenticated
using (bucket_id = 'brand-assets' and public.is_admin())
with check (bucket_id = 'brand-assets' and public.is_admin());

drop policy if exists "admins can delete brand assets" on storage.objects;
create policy "admins can delete brand assets" on storage.objects
for delete to authenticated
using (bucket_id = 'brand-assets' and public.is_admin());
