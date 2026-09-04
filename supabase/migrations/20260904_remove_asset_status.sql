-- Asset status is no longer part of the asset taxonomy or governance model.
-- Existing asset rows and private storage objects are retained.
do $$
declare
  non_null_status_count bigint;
begin
  if to_regclass('public.assets') is not null then
    select count(*) into non_null_status_count
    from public.assets
    where status is not null;
    raise notice 'Existing assets with non-null status before removal: %', non_null_status_count;
  end if;
end
$$;

alter table public.assets drop column if exists status;
drop type if exists public.asset_status;
