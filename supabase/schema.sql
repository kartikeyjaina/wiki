create extension if not exists pgcrypto;

create type public.app_role as enum ('member', 'admin');
create type public.idea_status as enum ('new', 'discussing', 'under_review', 'planned', 'in_progress', 'shipped', 'parked', 'declined', 'duplicate');
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
  display_order integer not null default 0,
  accent text not null default 'sage',
  is_visible boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_collection_name_nonempty check (char_length(trim(name)) > 0),
  constraint asset_collection_display_order_valid check (display_order > 0)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.asset_collections(id) on delete set null,
  name text not null,
  category text,
  asset_type text not null,
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

create table public.featured_kits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  package_storage_path text,
  package_size bigint,
  mime_type text not null default 'application/zip',
  display_order integer not null default 0,
  is_visible boolean not null default true,
  is_featured boolean not null default true,
  accent text not null default 'sage',
  archived_at timestamptz,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint featured_kit_name_nonempty check (char_length(trim(name)) > 0),
  constraint featured_kit_display_order_valid check (display_order > 0),
  constraint featured_kit_package_size_valid check (package_size is null or package_size >= 0)
);

create table public.featured_kit_collections (
  kit_id uuid not null references public.featured_kits(id) on delete cascade,
  collection_id uuid not null references public.asset_collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kit_id, collection_id)
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
  owner_id uuid references public.profiles(id) on delete set null,
  due_date date,
  priority text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add constraint projects_priority_valid check (priority in ('low', 'medium', 'high', 'urgent'));

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, title text not null, body text, entity_type public.entity_type, entity_id uuid, href text,
  read_at timestamptz, created_at timestamptz not null default now()
);

create table public.entity_follows (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type public.entity_type not null, entity_id uuid not null, created_at timestamptz not null default now(),
  unique(user_id, entity_type, entity_id)
);

create table public.user_asset_saves (
  user_id uuid not null references public.profiles(id) on delete cascade, asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id, asset_id)
);

create table public.recently_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade, entity_type public.entity_type not null, entity_id uuid not null,
  last_viewed_at timestamptz not null default now(), primary key(user_id, entity_type, entity_id)
);

create table public.comment_mentions (
  comment_id uuid not null references public.comments(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(comment_id, user_id)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'manager')), created_at timestamptz not null default now(), primary key(project_id, user_id)
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0), description text, display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')), due_date date, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.project_attachments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique, file_name text not null, description text, mime_type text,
  file_size bigint check (file_size is null or file_size >= 0), uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.project_todos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  completed boolean not null default false,
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
create index asset_collections_order_idx on public.asset_collections(display_order);
create index featured_kits_order_idx on public.featured_kits(display_order);

create or replace view public.asset_collection_counts
with (security_invoker = true)
as
select c.id, c.name, c.slug, c.description, c.display_order, c.accent, c.is_visible, c.archived_at, c.created_at, c.updated_at,
       count(a.id)::integer as file_count
from public.asset_collections c
left join public.assets a on a.collection_id = c.id
group by c.id;
create index project_todos_project_id_idx on public.project_todos(project_id);

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
  select w.id, 'wiki_page'::entity_type, w.title, left(w.content, 180), '/wiki/' || w.slug
  from public.wiki_pages w
  where (type_filter is null or type_filter = 'wiki') and concat_ws(' ', w.title, w.content, array_to_string(w.tags, ' ')) ilike '%' || search_query || '%'
  union all
  select a.id, 'asset'::entity_type, a.name, a.category, '/assets/' || a.id::text
  from public.assets a
  left join public.asset_collections ac on ac.id = a.collection_id
  where (type_filter is null or type_filter = 'assets') and concat_ws(' ', a.name, a.category, a.asset_type, ac.name, a.metadata::text) ilike '%' || search_query || '%'
  union all
  select i.id, 'idea'::entity_type, i.title, left(i.description, 180), '/ideas/' || i.id::text
  from public.ideas i
  where (type_filter is null or type_filter = 'ideas') and i.title ilike '%' || search_query || '%'
  union all
  select p.id, 'person'::entity_type, coalesce(p.display_name, 'Profile'), p.role::text, '/people/' || p.id::text
  from public.profiles p
  where (type_filter is null or type_filter = 'people') and coalesce(p.display_name, '') ilike '%' || search_query || '%'
  union all
  select c.id, 'comment'::entity_type, left(c.body, 90), c.body, '/' || c.entity_type::text || 's/' || c.entity_id::text
  from public.comments c
  where (type_filter is null or type_filter = 'comments') and c.body ilike '%' || search_query || '%'
  union all
  select p.id, 'project'::entity_type, p.title, p.description, '/projects/' || p.id::text
  from public.projects p
  where (type_filter is null or type_filter = 'projects') and concat_ws(' ', p.title, p.description, p.status) ilike '%' || search_query || '%'
  limit 30;
$$;

create or replace function public.entity_relationship_details(entity_type_input entity_type, entity_id_input uuid)
returns table(id uuid, from_type entity_type, from_id uuid, to_type entity_type, to_id uuid, relationship_type text, title text, href text)
language sql stable security invoker
as $$
  with related as (
    select r.id, r.from_type, r.from_id, r.to_type, r.to_id, r.relationship_type
    from public.entity_relationships r where r.from_type = entity_type_input and r.from_id = entity_id_input
    union all
    select r.id, r.from_type, r.from_id, r.to_type, r.to_id, r.relationship_type
    from public.entity_relationships r where r.to_type = entity_type_input and r.to_id = entity_id_input
  )
  select related.id, related.from_type, related.from_id, related.to_type, related.to_id, related.relationship_type,
    case related.to_type
      when 'asset' then (select a.name from public.assets a where a.id = related.to_id)
      when 'idea' then (select i.title from public.ideas i where i.id = related.to_id)
      when 'project' then (select p.title from public.projects p where p.id = related.to_id)
      when 'wiki_page' then (select w.title from public.wiki_pages w where w.id = related.to_id)
      when 'person' then (select coalesce(p.display_name, 'Profile') from public.profiles p where p.id = related.to_id)
      else 'Related record'
    end,
    case related.to_type
      when 'asset' then '/assets/' || related.to_id::text
      when 'idea' then '/ideas/' || related.to_id::text
      when 'project' then '/projects/' || related.to_id::text
      when 'wiki_page' then '/wiki/' || related.to_id::text
      when 'person' then '/people/' || related.to_id::text
      else '#'
    end
  from related;
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
alter table public.featured_kits enable row level security;
alter table public.featured_kit_collections enable row level security;
alter table public.idea_categories enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.comments enable row level security;
alter table public.projects enable row level security;
alter table public.project_todos enable row level security;
alter table public.activity_events enable row level security;
alter table public.reputation_events enable row level security;
alter table public.entity_relationships enable row level security;

create policy "members can read profiles" on public.profiles for select to authenticated using (true);
create policy "users can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members can read wiki" on public.wiki_pages for select to authenticated using (true);
create policy "admins can manage wiki" on public.wiki_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read wiki revisions" on public.wiki_page_revisions for select to authenticated using (true);
create policy "admins can manage wiki revisions" on public.wiki_page_revisions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members can read assets" on public.assets for select to authenticated using (public.is_admin() or not exists (select 1 from public.asset_collections c where c.id = assets.collection_id) or exists (select 1 from public.asset_collections c where c.id = assets.collection_id and c.is_visible = true and c.archived_at is null));
create policy "admins can manage assets" on public.assets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read asset collections" on public.asset_collections for select to authenticated using (public.is_admin() or (is_visible = true and archived_at is null));
create policy "admins can manage asset collections" on public.asset_collections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read featured kits" on public.featured_kits for select to authenticated using (public.is_admin() or (is_visible = true and is_featured = true and archived_at is null));
create policy "admins can manage featured kits" on public.featured_kits for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members can read kit collections" on public.featured_kit_collections for select to authenticated using (exists (select 1 from public.featured_kits k where k.id = kit_id and (public.is_admin() or (k.is_visible = true and k.is_featured = true and k.archived_at is null))));
create policy "admins can manage kit collections" on public.featured_kit_collections for all to authenticated using (public.is_admin()) with check (public.is_admin());
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
create policy "members can read project todos" on public.project_todos for select to authenticated using (true);
create policy "admins can manage project todos" on public.project_todos for all to authenticated using (public.is_admin()) with check (public.is_admin());
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
create policy "members can read published brand assets" on storage.objects
for select to authenticated
using (
  bucket_id = 'brand-assets' and (
    public.is_admin()
    or exists (select 1 from public.assets a join public.asset_collections c on c.id = a.collection_id where a.storage_path = name and c.is_visible = true and c.archived_at is null)
    or exists (select 1 from public.assets a where a.storage_path = name and a.collection_id is null)
    or exists (select 1 from public.featured_kits k where k.package_storage_path = name and k.is_visible = true and k.is_featured = true and k.archived_at is null)
  )
);

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

insert into public.asset_collections (name, slug, description, display_order, accent)
values
  ('Brand Guidelines & Identity', 'brand-guidelines-identity', 'Master guidance, voice, positioning, and the complete brand system.', 1, 'sage'),
  ('Logos', 'logos', 'Official source marks and usage-ready sizes for web, email, and print.', 2, 'butter'),
  ('Typography & Fonts', 'typography-fonts', 'Space Grotesk, Inter, font licenses, hierarchy, and implementation files.', 3, 'sky'),
  ('Colour Palettes', 'colour-palettes', 'Core monochrome values, accent colours, accessibility, and portable design tokens.', 4, 'blush'),
  ('Imagery & Photography', 'imagery-photography', 'Team portraits, workshop photography, and original brand imagery.', 5, 'lilac'),
  ('Video & Meeting Assets', 'video-meeting-assets', 'Zoom backgrounds, motion tokens, and presentation-ready visual space.', 6, 'sage'),
  ('Templates & Stationery', 'templates-stationery', 'Email signatures, letterhead, and presentation foundations.', 7, 'butter'),
  ('Social Media & Marketing', 'social-media-marketing', 'LinkedIn, X, Facebook, YouTube, Instagram, and social post formats.', 8, 'blush'),
  ('Product, Web & Interface', 'product-web-interface', 'Design tokens, components, digital states, icons, and data visualisation guidance.', 9, 'sky'),
  ('Events & Environmental', 'events-environmental', 'Stage screens, banners, badges, workshop signage, and printable event tools.', 10, 'lilac'),
  ('People, Recruitment & Internal Brand', 'people-recruitment-internal-brand', 'Employee cards, recruitment, onboarding, recognition, and internal communication.', 11, 'sage'),
  ('Governance, Archive & Source Files', 'governance-archive-source-files', 'Inventory, approvals, provenance, naming rules, specifications, and deprecated files.', 12, 'butter')
on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order, accent = excluded.accent;

insert into public.featured_kits (name, slug, description, display_order, accent)
values
  ('Complete Brand Library', 'complete-brand-library', 'The complete lightweight working library; large imagery and meeting files stay in focused packs.', 1, 'sage'),
  ('Logo Pack', 'logo-pack', 'Official masters plus usage-ready exports for digital and print.', 2, 'butter'),
  ('Meeting Backgrounds', 'meeting-backgrounds', 'Six polished 1920×1080 backgrounds for Zoom and Teams.', 3, 'sky'),
  ('Email Signatures', 'email-signatures', 'Four email-safe HTML signatures plus a visual setup reference.', 4, 'blush'),
  ('Social Media Kit', 'social-media-kit', 'Channel banners and post templates for the complete social system.', 5, 'lilac'),
  ('Imagery Pack', 'imagery-pack', 'Team portraits, workshop photography, and original imagery.', 6, 'sage'),
  ('Product Web Kit', 'product-web-kit', 'Design tokens, interface foundations, and digital accessibility guidance.', 7, 'butter'),
  ('Governance Kit', 'governance-kit', 'Brand rules, approval tools, inventory, provenance, and platform specifications.', 8, 'sky')
on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order, accent = excluded.accent;

create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index recently_viewed_user_idx on public.recently_viewed(user_id, last_viewed_at desc);
create index project_milestones_project_idx on public.project_milestones(project_id, display_order);
create index project_attachments_project_idx on public.project_attachments(project_id, created_at desc);

alter table public.notifications enable row level security;
alter table public.entity_follows enable row level security;
alter table public.user_asset_saves enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.comment_mentions enable row level security;
alter table public.project_members enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_attachments enable row level security;

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
create policy "project collaborators read attachments" on public.project_attachments for select to authenticated using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()))));
create policy "project collaborators manage attachments" on public.project_attachments for all to authenticated using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager')))) with check (uploaded_by = auth.uid() and (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager'))));
drop policy if exists "project managers upload attachments" on storage.objects;
create policy "project managers upload attachments" on storage.objects for insert to authenticated with check (bucket_id = 'brand-assets' and exists (select 1 from public.projects p where name like 'projects/' || p.id::text || '/%' and (public.is_admin() or p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager'))));
