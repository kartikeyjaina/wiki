-- Keep the deployed search function aligned with the Wiki workspace routes.
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
  where (type_filter is null or type_filter = 'ideas') and concat_ws(' ', i.title, i.description) ilike '%' || search_query || '%'
  union all
  select c.id, 'comment'::public.entity_type, left(c.body, 90), c.body,
    case c.entity_type
      when 'idea' then '/ideas/' || c.entity_id::text
      when 'project' then '/projects/' || c.entity_id::text
      when 'asset' then '/assets/' || c.entity_id::text
      when 'wiki_page' then '/wiki/' || c.entity_id::text
      else '#'
    end
  from public.comments c
  where (type_filter is null or type_filter = 'comments') and c.body ilike '%' || search_query || '%'
  union all
  select p.id, 'project'::public.entity_type, p.title, p.description, '/projects/' || p.id::text
  from public.projects p
  where (type_filter is null or type_filter = 'projects') and concat_ws(' ', p.title, p.description, p.status) ilike '%' || search_query || '%'
  union all
  select p.id, 'person'::public.entity_type, coalesce(p.display_name, 'Profile'), p.role::text, '/people/' || p.id::text
  from public.profiles p
  where (type_filter is null or type_filter = 'people') and concat_ws(' ', p.display_name, p.role::text) ilike '%' || search_query || '%'
  order by title
  limit 30;
$$;