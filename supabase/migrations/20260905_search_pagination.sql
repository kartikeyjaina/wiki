-- Paginated search endpoint for large workspaces. The original two-argument RPC remains unchanged.
create or replace function public.global_search(
  search_query text,
  type_filter text,
  page_size integer,
  page_offset integer
)
returns table(id uuid, type public.entity_type, title text, excerpt text, href text)
language sql stable security invoker as $$
  with matches as (
    select w.id, 'wiki_page'::public.entity_type as type, w.title, left(w.content, 180) as excerpt, '/wiki/' || w.slug as href
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
        when 'idea' then '/ideas/' || c.entity_id::text
        when 'project' then '/projects/' || c.entity_id::text
        when 'asset' then '/assets/' || c.entity_id::text
        when 'wiki_page' then coalesce((select '/wiki/' || w.slug from public.wiki_pages w where w.id = c.entity_id), '#')
        else '#'
      end
    from public.comments c
    where (type_filter is null or type_filter = 'comments') and c.body ilike '%' || search_query || '%'
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
  )
  select * from matches
  order by title
  limit greatest(1, least(coalesce(page_size, 30), 100))
  offset greatest(0, coalesce(page_offset, 0));
$$;

revoke execute on function public.global_search(text,text,integer,integer) from public;
grant execute on function public.global_search(text,text,integer,integer) to authenticated;
