## 4) Create a profile automatically after signup

This project expects every auth user to have a matching row in `public.profiles`.

Create a Postgres trigger in the SQL editor using the auth.users table.

Example trigger:

```sql
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

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

Important:

- This gives every new user a profile row
- The app uses profiles.id to fetch user details and role
- The admin UI depends on this row existing

---

## 5) Enforce the allowed email domains

To prevent unauthorized signups, enforce the domain allowlist before profile creation or after signup.

Recommended approach:

- Keep `VITE_ALLOWED_EMAIL_DOMAINS` in the frontend for UX hints
- Enforce in the database trigger or API layer for real security
- Deny unauthorized domains from creating a profile

Example validation logic:

```sql
create or replace function public.is_allowed_email_domain(email_input text)
returns boolean
language sql
stable
as $$
  select lower(split_part(email_input, '@', 2)) in ('futurelab.com');
$$;
```

Then in the trigger, only create the profile if the domain is allowed.

---

## 6) Set the first admin user

Once the profile trigger is active, promote a user to admin directly in the database:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_USER_UUID';
```

This is the user that will be allowed to access the admin UI and admin-only actions.

---

## 7) Enable row-level security (RLS)

The schema already turns on RLS on the key tables.

Make sure all app tables have policy coverage for:

- authenticated users can read shared records
- users can create their own ideas/comments/votes
- authors can edit their own records
- admins can moderate high-level content
- admins can manage assets, wiki, relationships, and governance metadata

This is the real enforcement layer behind the UI.

---

## 8) Create the storage bucket for asset uploads

In Supabase Storage:

1. Create a bucket named `brand-assets` or match the value in `VITE_SUPABASE_ASSET_BUCKET`
2. Set appropriate policies for:
   - users can read approved assets
   - admins can upload and update files
   - signed URL downloads work for asset previews and downloads

This supports:

- asset upload UI
- signed URL handling
- importer staging
- asset version history

---

## 9) Enable realtime

In Supabase Dashboard:

1. Go to Database → Replication
2. Enable realtime for tables used by live activity:
   - comments
   - activity_events
   - asset updates if needed
   - project updates if needed

This is required for live updates in comments, timelines, and activity panels.

---

## 10) Make sure the search function exists

The app calls:

- `public.global_search(search_query, type_filter)`

This function must exist in the database exactly as created in the schema.

It is expected to return results for:

- wiki pages
- assets
- ideas
- comments
- projects
- people

If it is missing or broken, global search will fail.

---

## 11) Prepare the asset importer

The app expects a real asset import pipeline for the existing Futurelab Brand Repository.

The importer should:

1. fetch or export source metadata from the repository
2. normalize categories and types
3. upload files into Supabase Storage
4. insert data into `asset_collections`, `assets`, `asset_versions`, and `asset_tags`
5. store `source_url`, `preview_url`, `usage_guidance`, governance metadata
6. mark versions carefully instead of inventing unknown fields

Implementation guidance is in:

- supabase/importer-notes.md

---

## 12) Test the critical flows before production

Use a real Supabase project and test these flows end-to-end:

- signup as allowed domain user
- signup as blocked domain user
- sign in with valid password
- sign in with wrong password
- profile row is created automatically
- admin role can access admin area
- non-admin cannot access admin area
- asset upload works in storage
- asset download returns a signed URL
- idea creation works
- voting works
- comments create/edit/delete work
- search returns records from multiple tables
- realtime subscription updates appear

---

## 13) Production hardening checklist

Before going live:

- remove placeholder env values
- lock RLS policies and test them with real roles
- use a real admin account only
- restrict storage bucket access to needed users only
- enable only the auth methods you actually want
- test email confirmation flow if enabled
- review rejected-domain behavior for users who are not allowed

---

## Summary

To make this app work properly in Supabase, the minimum required pieces are:

- Email auth enabled
- signup/login working
- automatic profile creation trigger
- domain allowlist enforcement
- admin role in profiles
- RLS enabled and tested
- asset bucket and storage policies
- search function
- realtime enabled
- proper asset import pipeline

Once these are in place, the app will behave like a real internal Futurelab workspace instead of a UI mock.
