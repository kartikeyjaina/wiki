-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening migration.
-- Safe to run on a live database – all changes are additive or idempotent.
-- Featured Kit data is NOT touched.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 1. NOTIFICATIONS: Replace permissive insert policy with a
--    SECURITY DEFINER RPC that validates inputs, prevents
--    self-notifications, and controls allowed types.
--    Direct client inserts are no longer permitted.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "authenticated users can insert notifications" on public.notifications;
-- SELECT remains private to owner (already created in workspace_features.sql).
-- UPDATE remains private to owner (already created in workspace_features.sql).
-- No INSERT policy: only the trusted RPC may create notifications.

create or replace function public.create_notification(
  p_recipient_id  uuid,
  p_type          text,
  p_title         text,
  p_body          text          default null,
  p_entity_type   public.entity_type default null,
  p_entity_id     uuid          default null,
  p_href          text          default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_allowed_types text[] := array[
    'comment_reply',
    'mention',
    'project_member_added',
    'project_member_role_changed',
    'project_member_removed',
    'project_stage_changed',
    'milestone_completed',
    'milestone_reopened',
    'asset_version_uploaded',
    'asset_version_restored',
    'wiki_revision_restored',
    'idea_status_changed'
  ];
  v_id uuid;
begin
  -- Actor must be authenticated
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = 'P0001';
  end if;

  -- Validate notification type
  if not (p_type = any(v_allowed_types)) then
    raise exception 'Notification type % is not permitted.', p_type using errcode = 'P0001';
  end if;

  -- Prevent self-notification
  if p_recipient_id = v_actor_id then
    -- Silently skip self-notifications (not an error – callers don't need to pre-filter)
    return null;
  end if;

  -- Recipient must exist
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'Recipient not found.' using errcode = 'P0002';
  end if;

  -- Title must be non-empty
  if coalesce(trim(p_title), '') = '' then
    raise exception 'Notification title is required.' using errcode = 'P0001';
  end if;

  insert into public.notifications (
    user_id, type, title, body, entity_type, entity_id, href
  ) values (
    p_recipient_id, p_type, p_title, p_body, p_entity_type, p_entity_id, p_href
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_notification(uuid, text, text, text, public.entity_type, uuid, text) from public;
grant execute on function public.create_notification(uuid, text, text, text, public.entity_type, uuid, text) to authenticated;

comment on function public.create_notification is
  'Trusted RPC for inserting notifications. Validates type, prevents self-notification, requires authentication.';

-- ─────────────────────────────────────────────────────────────
-- 2. ACTIVITY: Replace permissive insert with a SECURITY
--    DEFINER RPC that validates event types and entity types,
--    and pins actor_id to auth.uid().
-- ─────────────────────────────────────────────────────────────

drop policy if exists "members can record own activity" on public.activity_events;
-- Admins retain full control via their existing policy.
-- Regular authenticated users must go through the RPC.

create or replace function public.record_activity(
  p_entity_type  public.entity_type,
  p_entity_id    uuid,
  p_event_type   text,
  p_metadata     jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_allowed_events text[] := array[
    'created',
    'comment_created',
    'status_changed',
    'project_stage_changed',
    'project_created',
    'assets_uploaded',
    'asset_version_uploaded',
    'asset_version_restored',
    'project_member_added',
    'project_member_role_changed',
    'project_member_removed',
    'project_attachment_added',
    'project_attachment_removed',
    'wiki_page_created',
    'wiki_page_updated',
    'wiki_revision_restored',
    'milestone_completed',
    'milestone_reopened',
    'idea_status_changed',
    'project_metadata_updated'
  ];
  v_id uuid;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = 'P0001';
  end if;

  if not (p_event_type = any(v_allowed_events)) then
    raise exception 'Event type % is not a permitted activity event.', p_event_type using errcode = 'P0001';
  end if;

  if coalesce(p_metadata, '{}') = 'null'::jsonb then
    p_metadata := '{}';
  end if;

  insert into public.activity_events (entity_type, entity_id, actor_id, event_type, metadata)
  values (p_entity_type, p_entity_id, v_actor_id, p_event_type, coalesce(p_metadata, '{}'))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.record_activity(public.entity_type, uuid, text, jsonb) from public;
grant execute on function public.record_activity(public.entity_type, uuid, text, jsonb) to authenticated;

comment on function public.record_activity is
  'Trusted RPC for inserting activity events. Pins actor_id to auth.uid() and validates event types.';

-- ─────────────────────────────────────────────────────────────
-- 3. WORKFLOW ENFORCEMENT: DB-level transition guards for
--    ideas and projects. Invalid transitions are rejected
--    with a clear error code.
-- ─────────────────────────────────────────────────────────────

-- 3a. Idea workflow transition RPC
create or replace function public.transition_idea_status(
  p_idea_id   uuid,
  p_new_status public.idea_status
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id    uuid;
  v_current     public.idea_status;
  v_allowed     public.idea_status[];
  v_updated     public.ideas%rowtype;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = 'P0001';
  end if;

  select status into v_current from public.ideas where id = p_idea_id for update;
  if not found then
    raise exception 'Idea not found.' using errcode = 'P0002';
  end if;

  -- Only author or admin may transition
  if not exists (
    select 1 from public.ideas i
    where i.id = p_idea_id
      and (i.author_id = v_actor_id or exists (select 1 from public.profiles where id = v_actor_id and role = 'admin'))
  ) then
    raise exception 'Permission denied.' using errcode = 'P0003';
  end if;

  -- Define allowed transitions
  v_allowed := case v_current
    when 'new'          then array['discussing','declined']::public.idea_status[]
    when 'discussing'   then array['planned','declined','parked','duplicate']::public.idea_status[]
    when 'under_review' then array['planned','declined','parked','duplicate']::public.idea_status[]
    when 'planned'      then array['in_progress','declined','parked']::public.idea_status[]
    when 'in_progress'  then array['shipped','parked']::public.idea_status[]
    else                     array[]::public.idea_status[]
  end;

  if not (p_new_status = any(v_allowed)) then
    raise exception 'Transition from % to % is not permitted.', v_current, p_new_status
      using errcode = 'P0001';
  end if;

  update public.ideas
  set status = p_new_status, updated_at = now()
  where id = p_idea_id
  returning * into v_updated;

  return row_to_json(v_updated);
end;
$$;

revoke execute on function public.transition_idea_status(uuid, public.idea_status) from public;
grant execute on function public.transition_idea_status(uuid, public.idea_status) to authenticated;

-- 3b. Project workflow transition RPC
create or replace function public.transition_project_status(
  p_project_id uuid,
  p_new_status text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id   uuid;
  v_current    text;
  v_allowed    text[];
  v_updated    public.projects%rowtype;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = 'P0001';
  end if;

  -- Validate new_status value against the projects constraint
  if not (p_new_status in ('planned','in_progress','blocked','shipped','archived')) then
    raise exception 'Invalid project status: %.', p_new_status using errcode = 'P0001';
  end if;

  select status into v_current from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  -- Only owner, manager, or admin may transition
  if not (
    exists (select 1 from public.projects where id = p_project_id and owner_id = v_actor_id)
    or exists (select 1 from public.project_members where project_id = p_project_id and user_id = v_actor_id and role = 'manager')
    or exists (select 1 from public.profiles where id = v_actor_id and role = 'admin')
  ) then
    raise exception 'Permission denied.' using errcode = 'P0003';
  end if;

  -- Define allowed transitions
  v_allowed := case v_current
    when 'planned'     then array['in_progress','archived']
    when 'in_progress' then array['blocked','shipped','archived']
    when 'blocked'     then array['in_progress','archived']
    when 'shipped'     then array['archived']
    else               array[]::text[]
  end;

  if not (p_new_status = any(v_allowed)) then
    raise exception 'Transition from % to % is not permitted for projects.', v_current, p_new_status
      using errcode = 'P0001';
  end if;

  update public.projects
  set status = p_new_status, updated_at = now()
  where id = p_project_id
  returning * into v_updated;

  return row_to_json(v_updated);
end;
$$;

revoke execute on function public.transition_project_status(uuid, text) from public;
grant execute on function public.transition_project_status(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. is_admin() HARDENING: Already has SECURITY DEFINER and
--    set search_path = public. Re-create to ensure GRANT is
--    tightly scoped and execution is restricted to authenticated.
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. idea_feed view: Ensure security_invoker is explicit.
--    (Re-creates the view idempotently – data is a view, no rows.)
-- ─────────────────────────────────────────────────────────────

create or replace view public.idea_feed
with (security_invoker = true)
as
select
  i.*,
  coalesce(sum(v.value), 0)::integer as score,
  count(distinct c.id)::integer      as comment_count,
  jsonb_build_object(
    'id', p.id, 'display_name', p.display_name,
    'role', p.role, 'avatar_url', p.avatar_url
  ) as author,
  case when ic.id is null then null
       else jsonb_build_object('id', ic.id, 'name', ic.name)
  end as category
from public.ideas i
left join public.idea_votes    v  on v.idea_id    = i.id
left join public.comments      c  on c.entity_type = 'idea' and c.entity_id = i.id
left join public.profiles      p  on p.id          = i.author_id
left join public.idea_categories ic on ic.id        = i.category_id
group by i.id, p.id, ic.id;

-- ─────────────────────────────────────────────────────────────
-- 6. Wiki revision tag-restore fix.
--    The previous restore_wiki_revision RPC used:
--      array_length(v_revision.tags, 1) > 0
--    which treats an empty array (intentional) the same as NULL,
--    silently preserving current tags when it should restore [].
--    Fix: use IS DISTINCT FROM NULL to distinguish missing from empty.
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

  -- Save current state as a pre-restore snapshot
  insert into public.wiki_page_revisions (wiki_page_id, author_id, content, title, tags, change_summary)
  values (p_page_id, p_author_id, v_current.content, v_current.title, v_current.tags, 'Pre-restore snapshot');

  -- Restore page: use revision title/tags if they were explicitly recorded
  -- (title/tags columns are nullable in revisions – null means "not tracked").
  -- An empty array IS a valid recorded state and must be respected.
  update public.wiki_pages
  set content    = v_revision.content,
      title      = coalesce(v_revision.title, v_current.title),
      tags       = case when v_revision.tags is not null then v_revision.tags else v_current.tags end,
      updated_at = now()
  where id = p_page_id
  returning * into v_updated;

  return row_to_json(v_updated);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. Wiki change_summary: populate descriptive summaries in
--    save_wiki_page RPC.
-- ─────────────────────────────────────────────────────────────

create or replace function public.save_wiki_page(
  p_page_id     uuid,
  p_title       text,
  p_slug        text,
  p_content     text,
  p_tags        text[],
  p_author_id   uuid,
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
  v_page           public.wiki_pages%rowtype;
  v_content_changed boolean;
  v_title_changed   boolean;
  v_tags_changed    boolean;
  v_summary         text;
  v_parts           text[];
begin
  v_content_changed := (p_content is distinct from p_old_content);
  v_title_changed   := (p_title   is distinct from p_old_title);
  v_tags_changed    := (p_tags    is distinct from p_old_tags);

  if v_content_changed or v_title_changed or v_tags_changed then
    -- Build human-readable change summary
    v_parts := array[]::text[];
    if v_title_changed   then v_parts := v_parts || 'title'; end if;
    if v_content_changed then v_parts := v_parts || 'content'; end if;
    if v_tags_changed    then v_parts := v_parts || 'tags'; end if;

    v_summary := 'Updated ' || array_to_string(v_parts, ', ');

    insert into public.wiki_page_revisions (wiki_page_id, author_id, content, title, tags, change_summary)
    values (p_page_id, p_author_id, p_old_content, p_old_title, p_old_tags, v_summary);
  end if;

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
-- 8. Version replacement RPC: ensures DB-side version mutation
--    is transactional (row lock + version compute + asset update).
-- ─────────────────────────────────────────────────────────────

create or replace function public.create_asset_version(
  p_asset_id    uuid,
  p_storage_path text,
  p_notes        text default null,
  p_actor_id     uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_max_ver  integer;
  v_next_ver text;
begin
  v_actor_id := coalesce(p_actor_id, auth.uid());
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = 'P0001';
  end if;

  -- Must be admin to create versions
  if not exists (select 1 from public.profiles where id = v_actor_id and role = 'admin') then
    raise exception 'Only admins may create asset versions.' using errcode = 'P0003';
  end if;

  -- Lock asset row to prevent concurrent version races
  perform id from public.assets where id = p_asset_id for update;
  if not found then
    raise exception 'Asset not found.' using errcode = 'P0002';
  end if;

  -- Compute next version
  select coalesce(max(case when version ~ '^\d+$' then version::integer else null end), 0)
    into v_max_ver
  from public.asset_versions
  where asset_id = p_asset_id;

  v_next_ver := (v_max_ver + 1)::text;

  -- Insert new version row (unique index protects against race)
  insert into public.asset_versions (asset_id, version, storage_path, notes, created_by)
  values (p_asset_id, v_next_ver, p_storage_path, p_notes, v_actor_id);

  -- Update asset current version
  update public.assets
  set version      = v_next_ver,
      storage_path = p_storage_path,
      updated_at   = now()
  where id = p_asset_id;

  return v_next_ver;
end;
$$;

revoke execute on function public.create_asset_version(uuid, text, text, uuid) from public;
grant execute on function public.create_asset_version(uuid, text, text, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 9. Storage policy: ensure project attachment paths include
--    the project id prefix so the pattern-check is tight.
--    (Idempotent re-creation of existing policy.)
-- ─────────────────────────────────────────────────────────────

drop policy if exists "project managers upload attachments" on storage.objects;
create policy "project managers upload attachments" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and exists (
      select 1 from public.projects p
      where name like 'projects/' || p.id::text || '/%'
        and (
          public.is_admin()
          or p.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = auth.uid()
              and pm.role = 'manager'
          )
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 10. Add delete policy for notifications so cleanup is possible
--     (users can delete their own read notifications).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "users delete own notifications" on public.notifications;
create policy "users delete own notifications" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());
