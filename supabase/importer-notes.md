# Asset Import Architecture

The application does not hardcode the existing Futurelab Brand Repository assets.

Use an importer that maps source records into:

- `asset_collections`
- `assets`
- `asset_versions`
- `asset_tags`
- Supabase Storage paths
- governance fields that actually exist in the source

Recommended flow:

1. Export or fetch source repository metadata with explicit permission.
2. Normalize categories to the application taxonomy.
3. Upload binary files to Supabase Storage.
4. Insert asset metadata with source URLs and governance fields when present.
5. Skip unknown metadata rather than inventing it.
6. Run a dry-run report before committing rows.

The UI is designed to remain polished when the import has not run yet.
