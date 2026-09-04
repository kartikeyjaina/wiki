-- Workspace consistency fixes. Core mutations are transactional; security model is unchanged.

create or replace function public.swap_project_milestones(p_project_id uuid, p_current_id uuid, p_other_id uuid, p_actor_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare v_current_order integer; v_other_order integer;
begin
  select display_order into v_current_order from public.project_milestones where id = p_current_id and project_id = p_project_id for update;
  select display_order into v_other_order from public.project_milestones where id = p_other_id and project_id = p_project_id for update;
  if v_current_order is null or v_other_order is null then raise exception 'Milestones not found.' using errcode = 'P0002'; end if;
  update public.project_milestones set display_order = -display_order - 1, updated_at = now() where id = p_current_id and project_id = p_project_id;
  update public.project_milestones set display_order = v_current_order, updated_at = now() where id = p_other_id and project_id = p_project_id;
  update public.project_milestones set display_order = v_other_order, updated_at = now() where id = p_current_id and project_id = p_project_id;
end; $$;
revoke execute on function public.swap_project_milestones(uuid,uuid,uuid,uuid) from public;
grant execute on function public.swap_project_milestones(uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.create_comment_with_mentions(p_entity_type public.entity_type, p_entity_id uuid, p_parent_id uuid, p_body text, p_mention_user_ids uuid[], p_author_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_comment_id uuid;
begin
  insert into public.comments(entity_type, entity_id, parent_id, author_id, body) values (p_entity_type, p_entity_id, p_parent_id, p_author_id, trim(p_body)) returning id into v_comment_id;
  insert into public.comment_mentions(comment_id, user_id) select v_comment_id, uid from unnest(coalesce(p_mention_user_ids, '{}'::uuid[])) uid where uid <> p_author_id on conflict do nothing;
  return v_comment_id;
end; $$;
revoke execute on function public.create_comment_with_mentions(public.entity_type,uuid,uuid,text,uuid[],uuid) from public;
grant execute on function public.create_comment_with_mentions(public.entity_type,uuid,uuid,text,uuid[],uuid) to authenticated;

create or replace function public.update_comment_with_mentions(p_comment_id uuid, p_body text, p_mention_user_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
declare v_author_id uuid;
begin
  select author_id into v_author_id from public.comments where id = p_comment_id for update;
  if v_author_id is null then raise exception 'Comment not found.' using errcode = 'P0002'; end if;
  update public.comments set body = trim(p_body), edited_at = now(), updated_at = now() where id = p_comment_id;
  delete from public.comment_mentions where comment_id = p_comment_id;
  insert into public.comment_mentions(comment_id, user_id) select p_comment_id, uid from unnest(coalesce(p_mention_user_ids, '{}'::uuid[])) uid where uid <> v_author_id on conflict do nothing;
end; $$;
revoke execute on function public.update_comment_with_mentions(uuid,text,uuid[]) from public;
grant execute on function public.update_comment_with_mentions(uuid,text,uuid[]) to authenticated;

drop policy if exists "authors can delete own comment mentions" on public.comment_mentions;
create policy "authors can delete own comment mentions" on public.comment_mentions for delete to authenticated using (exists (select 1 from public.comments c where c.id = comment_id and c.author_id = auth.uid()));

create or replace function public.entity_relationship_details(entity_type_input public.entity_type, entity_id_input uuid)
returns table(id uuid, from_type public.entity_type, from_id uuid, to_type public.entity_type, to_id uuid, relationship_type text, title text, href text)
language sql stable security invoker as $$
  with related as (
    select r.id, r.from_type, r.from_id, r.to_type, r.to_id, r.relationship_type from public.entity_relationships r where r.from_type = entity_type_input and r.from_id = entity_id_input
    union all select r.id, r.from_type, r.from_id, r.to_type, r.to_id, r.relationship_type from public.entity_relationships r where r.to_type = entity_type_input and r.to_id = entity_id_input
  ), resolved as (
    select related.*, case when related.from_type = entity_type_input and related.from_id = entity_id_input then related.to_type else related.from_type end as related_type, case when related.from_type = entity_type_input and related.from_id = entity_id_input then related.to_id else related.from_id end as related_id from related
  )
  select r.id, r.from_type, r.from_id, r.to_type, r.to_id, r.relationship_type,
    case r.related_type when 'asset' then (select a.name from public.assets a where a.id = r.related_id) when 'idea' then (select i.title from public.ideas i where i.id = r.related_id) when 'project' then (select p.title from public.projects p where p.id = r.related_id) when 'wiki_page' then (select w.title from public.wiki_pages w where w.id = r.related_id) when 'person' then (select coalesce(p.display_name, 'Profile') from public.profiles p where p.id = r.related_id) else 'Related record' end,
    case r.related_type when 'asset' then '/assets/' || r.related_id::text when 'idea' then '/ideas/' || r.related_id::text when 'project' then '/projects/' || r.related_id::text when 'wiki_page' then coalesce((select '/wiki/' || w.slug from public.wiki_pages w where w.id = r.related_id), '#') when 'person' then '/people/' || r.related_id::text else '#' end
  from resolved r;
$$;

revoke execute on function public.save_wiki_page(uuid,text,text,text,text[],uuid,text,text,text[]) from public;
grant execute on function public.save_wiki_page(uuid,text,text,text,text[],uuid,text,text,text[]) to authenticated;

create or replace function public.global_search(search_query text, type_filter text default null)
returns table(id uuid, type public.entity_type, title text, excerpt text, href text)
language sql stable security invoker as $$
  select w.id, 'wiki_page'::public.entity_type, w.title, left(w.content, 180), '/wiki/' || w.slug from public.wiki_pages w where (type_filter is null or type_filter = 'wiki') and concat_ws(' ', w.title, w.content, array_to_string(w.tags, ' ')) ilike '%' || search_query || '%'
  union all select a.id, 'asset'::public.entity_type, a.name, a.category, '/assets/' || a.id::text from public.assets a left join public.asset_collections ac on ac.id = a.collection_id where (type_filter is null or type_filter = 'assets') and concat_ws(' ', a.name, a.category, a.asset_type, ac.name, a.metadata::text) ilike '%' || search_query || '%'
  union all select i.id, 'idea'::public.entity_type, i.title, left(i.description, 180), '/ideas/' || i.id::text from public.ideas i where (type_filter is null or type_filter = 'ideas') and concat_ws(' ', i.title, i.description) ilike '%' || search_query || '%'
  union all select c.id, 'comment'::public.entity_type, left(c.body, 90), c.body, case c.entity_type when 'idea' then '/ideas/' || c.entity_id::text when 'project' then '/projects/' || c.entity_id::text when 'asset' then '/assets/' || c.entity_id::text when 'wiki_page' then coalesce((select '/wiki/' || w.slug from public.wiki_pages w where w.id = c.entity_id), '#') else '#' end from public.comments c where (type_filter is null or type_filter = 'comments') and c.body ilike '%' || search_query || '%'
  union all select p.id, 'project'::public.entity_type, p.title, p.description, '/projects/' || p.id::text from public.projects p where (type_filter is null or type_filter = 'projects') and concat_ws(' ', p.title, p.description, p.status) ilike '%' || search_query || '%'
  union all select p.id, 'person'::public.entity_type, coalesce(p.display_name, 'Profile'), p.role::text, '/people/' || p.id::text from public.profiles p where (type_filter is null or type_filter = 'people') and concat_ws(' ', p.display_name, p.role::text) ilike '%' || search_query || '%'
  order by title limit 30;
$$;
