-- Phase 8: Final RLS, schema drift, notifications insert policy, project todos read,
-- wiki revision metadata, asset version restore RPC, search fix for wiki comments,
-- notification insert policy, and misc corrections.
-- Safe to run on a live database. All operations are additive or idempotent.

-- ─────────────────────────────────────────────────────────────
-- 1. Notifications: members must be able to INSERT notifications
--    for other users (e.g. mention, reply). The acting user's own
--    notification inserts happen server-side in hooks/useComments.
--    We allow inserting rows on behalf of any user_id but only
--    from authenticated callers (RLS already gates reads to the
--    owner). We do NOT use `using (true)` for select – that already
--    exists.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "authenticated users can insert notifications" on public.notifications;
create policy "authenticated users can insert notifications"
  on public.notifications for insert to authenticated
  with check (true);

-- ─────────────────────────────────────────────────────────────
-- 2. Project todos: ensure all project participants can SELECT.
--    The existing "admins can manage project todos" covers admins.
--    "project collaborators manage todos" covers owners/managers.
--    But plain project members (reader role) cannot read todos.
--    Add an explicit read policy that mirrors the project member
--    visibility model (same as attachments read policy).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "project members read todos" on public.project_todos;
create policy "project members read todos"
  on public.project_todos for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = auth.uid()
          )
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Wiki page revisions: add title, tags, slug snapshot columns
--    so metadata revisions are tracked alongside content.
-- ─────────────────────────────────────────────────────────────
alter table public.wiki_page_revisions
  add column if not exists title text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists change_summary text;

-- ─────────────────────────────────────────────────────────────
-- 4. Asset version restore RPC (transactional)
--    Restoring a version:
--      1. Reads the target version row.
--      2. Inserts a new version row with the next version number.
--      3. Updates the asset's current version + storage_path atomically.
--    Returns the new version string.
-- ─────────────────────────────────────────────────────────────
create or replace function public.restore_asset_version(
  p_asset_id uuid,
  p_version_id uuid,
  p_actor_id uuid
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_source     public.asset_versions%rowtype;
  v_next_ver   text;
  v_max_ver    integer;
begin
  -- Lock the asset row to prevent concurrent version races.
  perform id from public.assets where id = p_asset_id for update;

  -- Read the version being restored.
  select * into v_source
  from public.asset_versions
  where id = p_version_id and asset_id = p_asset_id;

  if not found then
    raise exception 'Version not found for this asset.' using errcode = 'P0002';
  end if;

  -- Compute next version number.
  select coalesce(max(case when version ~ '^\d+$' then version::integer else null end), 0)
    into v_max_ver
  from public.asset_versions
  where asset_id = p_asset_id;

  v_next_ver := (v_max_ver + 1)::text;

  -- Insert the restore version record.
  insert into public.asset_versions (asset_id, version, storage_path, notes, created_by)
  values (p_asset_id, v_next_ver, v_source.storage_path, 'Restored from version ' || v_source.version, p_actor_id);

  -- Update the asset row.
  update public.assets
  set version      = v_next_ver,
      storage_path = v_source.storage_path,
      updated_at   = now()
  where id = p_asset_id;

  return v_next_ver;
end;
$$;

-- Grant execute to authenticated users; RLS on asset_versions still
-- restricts what they can read/write through the function body.
revoke execute on function public.restore_asset_version(uuid, uuid, uuid) from public;
grant execute on function public.restore_asset_version(uuid, uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Fix wiki_page comment search routing.
--    Comments on wiki_pages currently produce href = '/wiki/<entity_id>'
--    but the app routes by slug not UUID. We fix by joining wiki_pages
--    to resolve the slug.
-- ─────────────────────────────────────────────────────────────
create or replace function public.global_search(search_query text, type_filter text default null)
returns table(id uuid, type public.entity_type, title text, excerpt text, href text)
language sql
stable
security invoker
as $$
  select w.id, 'wiki_page'::public.entity_type, w.title, left(w.content, 180), '/wiki/' || w.slug
  from public.wiki_pages w
  where (type_filter is null or type_filter = 'wiki')
    and concat_ws(' ', w.title, w.content, array_to_string(w.tags, ' ')) ilike '%' || search_query || '%'

  union all

  select a.id, 'asset'::public.entity_type, a.name, a.category, '/assets/' || a.id::text
  from public.assets a
  left join public.asset_collections ac on ac.id = a.collection_id
  where (type_filter is null or type_filter = 'assets')
    and concat_ws(' ', a.name, a.category, a.asset_type, ac.name, a.metadata::text) ilike '%' || search_query || '%'

  union all

  select i.id, 'idea'::public.entity_type, i.title, left(i.description, 180), '/ideas/' || i.id::text
  from public.ideas i
  where (type_filter is null or type_filter = 'ideas')
    and concat_ws(' ', i.title, i.description) ilike '%' || search_query || '%'

  union all

  select c.id, 'comment'::public.entity_type, left(c.body, 90), c.body,
    case c.entity_type
      when 'idea'      then '/ideas/'    || c.entity_id::text
      when 'project'   then '/projects/' || c.entity_id::text
      when 'asset'     then '/assets/'   || c.entity_id::text
      when 'wiki_page' then coalesce(
        (select '/wiki/' || wp.slug from public.wiki_pages wp where wp.id = c.entity_id limit 1),
        '/wiki/' || c.entity_id::text
      )
      else '#'
    end
  from public.comments c
  where (type_filter is null or type_filter = 'comments')
    and c.body ilike '%' || search_query || '%'

  union all

  select p.id, 'project'::public.entity_type, p.title, p.description, '/projects/' || p.id::text
  from public.projects p
  where (type_filter is null or type_filter = 'projects')
    and concat_ws(' ', p.title, p.description, p.status) ilike '%' || search_query || '%'

  union all

  select p.id, 'person'::public.entity_type, coalesce(p.display_name, 'Profile'), p.role::text, '/people/' || p.id::text
  from public.profiles p
  where (type_filter is null or type_filter = 'people')
    and concat_ws(' ', p.display_name, p.role::text) ilike '%' || search_query || '%'

  order by title
  limit 30;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Wiki save atomicity RPC
--    Combines page update + revision insert in one transaction.
--    Returns the updated wiki_page row as JSON.
-- ─────────────────────────────────────────────────────────────
create or replace function public.save_wiki_page(
  p_page_id    uuid,
  p_title      text,
  p_slug       text,
  p_content    text,
  p_tags       text[],
  p_author_id  uuid,
  p_old_title   text,
  p_old_content text,
  p_old_tags    text[]
)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_page   public.wiki_pages%rowtype;
  v_changed boolean;
begin
  -- Detect meaningful change
  v_changed := (p_content is distinct from p_old_content)
            or (p_title   is distinct from p_old_title)
            or (p_tags    is distinct from p_old_tags);

  -- Save revision of previous state first (so we always have the old copy)
  if v_changed then
    insert into public.wiki_page_revisions (wiki_page_id, author_id, content, title, tags, change_summary)
    values (p_page_id, p_author_id, p_old_content, p_old_title, p_old_tags, null);
  end if;

  -- Update the page
  update public.wiki_pages
  set title      = p_title,
      slug       = p_slug,
      content    = p_content,
      tags       = p_tags,
      updated_at = now()
  where id = p_page_id
  returning * into v_page;

  if not found then
    raise exception 'Wiki page not found.' using errcode = 'P0002';
  end if;

  return row_to_json(v_page);
end;
$$;

revoke execute on function public.save_wiki_page(uuid,text,text,text,text[],uuid,text,text,text[]) from public;
grant execute on function public.save_wiki_page(uuid,text,text,text[],uuid,text,text,text[]) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. Wiki restore atomicity RPC
-- ─────────────────────────────────────────────────────────────
create or replace function public.restore_wiki_revision(
  p_page_id     uuid,
  p_revision_id uuid,
  p_author_id   uuid
)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_revision  public.wiki_page_revisions%rowtype;
  v_current   public.wiki_pages%rowtype;
  v_updated   public.wiki_pages%rowtype;
begin
  select * into v_current from public.wiki_pages where id = p_page_id for update;
  if not found then raise exception 'Wiki page not found.' using errcode = 'P0002'; end if;

  select * into v_revision from public.wiki_page_revisions
  where id = p_revision_id and wiki_page_id = p_page_id;
  if not found then raise exception 'Revision not found.' using errcode = 'P0002'; end if;

  -- Save current state as a new revision before overwriting
  insert into public.wiki_page_revisions (wiki_page_id, author_id, content, title, tags, change_summary)
  values (p_page_id, p_author_id, v_current.content, v_current.title, v_current.tags, 'Pre-restore snapshot');

  -- Restore page to revision content (title/tags if present in revision)
  update public.wiki_pages
  set content    = v_revision.content,
      title      = coalesce(v_revision.title, v_current.title),
      tags       = case when array_length(v_revision.tags, 1) > 0 then v_revision.tags else v_current.tags end,
      updated_at = now()
  where id = p_page_id
  returning * into v_updated;

  return row_to_json(v_updated);
end;
$$;

revoke execute on function public.restore_wiki_revision(uuid,uuid,uuid) from public;
grant execute on function public.restore_wiki_revision(uuid,uuid,uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8. Ensure idea_feed view is security-invoker (not definer)
-- ─────────────────────────────────────────────────────────────
create or replace view public.idea_feed
with (security_invoker = true)
as
select
  i.*,
  coalesce(sum(v.value), 0)::integer as score,
  count(distinct c.id)::integer as comment_count,
  jsonb_build_object('id', p.id, 'display_name', p.display_name, 'role', p.role, 'avatar_url', p.avatar_url) as author,
  case when ic.id is null then null
       else jsonb_build_object('id', ic.id, 'name', ic.name)
  end as category
from public.ideas i
left join public.idea_votes v on v.idea_id = i.id
left join public.comments c on c.entity_type = 'idea' and c.entity_id = i.id
left join public.profiles p on p.id = i.author_id
left join public.idea_categories ic on ic.id = i.category_id
group by i.id, p.id, ic.id;

-- ─────────────────────────────────────────────────────────────
-- 9. Add useful indexes that are currently missing
-- ─────────────────────────────────────────────────────────────
create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists project_attachments_project_idx on public.project_attachments(project_id, created_at desc);
create index if not exists asset_versions_asset_id_idx on public.asset_versions(asset_id, created_at desc);
create index if not exists recently_viewed_user_idx on public.recently_viewed(user_id, last_viewed_at desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists comment_mentions_user_id_idx on public.comment_mentions(user_id);
create index if not exists wiki_revisions_page_idx on public.wiki_page_revisions(wiki_page_id, created_at desc);
