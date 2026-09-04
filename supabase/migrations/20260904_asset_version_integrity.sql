-- Protect version allocation and allow authorized members to download historical versions.
create unique index if not exists asset_versions_asset_id_version_idx
on public.asset_versions(asset_id, version);

drop policy if exists "members can read published brand assets" on storage.objects;
create policy "members can read published brand assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'brand-assets' and (
    public.is_admin()
    or exists (
      select 1
      from public.assets a
      join public.asset_collections c on c.id = a.collection_id
      where a.storage_path = name
        and c.is_visible = true
        and c.archived_at is null
    )
    or exists (
      select 1
      from public.assets a
      where a.storage_path = name
        and a.collection_id is null
    )
    or exists (
      select 1
      from public.asset_versions av
      join public.assets a on a.id = av.asset_id
      left join public.asset_collections c on c.id = a.collection_id
      where av.storage_path = name
        and (a.collection_id is null or (c.is_visible = true and c.archived_at is null))
    )
    or exists (
      select 1
      from public.featured_kits k
      where k.package_storage_path = name
        and k.is_visible = true
        and k.is_featured = true
        and k.archived_at is null
    )
  )
);
