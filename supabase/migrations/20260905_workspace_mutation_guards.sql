-- Transactional mutation guards. Security policy is unchanged.

create or replace function public.create_idea_if_title_available(
  p_title text,
  p_description text,
  p_why_it_matters text,
  p_optional_links text,
  p_author_id uuid,
  p_raw_category text
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_title)), 0));
  if exists (select 1 from public.ideas where lower(trim(title)) = lower(trim(p_title))) then
    raise exception 'An idea with this title already exists.' using errcode = '23505';
  end if;
  insert into public.ideas(title, description, why_it_matters, optional_links, author_id, raw_category)
  values (trim(p_title), trim(p_description), nullif(trim(p_why_it_matters), ''), nullif(trim(p_optional_links), ''), p_author_id, trim(p_raw_category))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.create_idea_if_title_available(text,text,text,text,uuid,text) from public;
grant execute on function public.create_idea_if_title_available(text,text,text,text,uuid,text) to authenticated;

create or replace function public.create_project_milestone(
  p_project_id uuid,
  p_title text,
  p_description text default null,
  p_status text default null,
  p_due_date date default null,
  p_completed_at timestamptz default null
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_order integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));
  select coalesce(max(display_order) + 1, 0) into v_order from public.project_milestones where project_id = p_project_id;
  insert into public.project_milestones(project_id, title, description, status, due_date, completed_at, display_order)
  values (p_project_id, trim(p_title), p_description, p_status, p_due_date, p_completed_at, v_order)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.create_project_milestone(uuid,text,text,text,date,timestamptz) from public;
grant execute on function public.create_project_milestone(uuid,text,text,text,date,timestamptz) to authenticated;
