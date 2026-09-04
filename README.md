# Futurelab Wiki

Internal workspace for shared knowledge, brand assets, ideas, projects, comments, and activity.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Supabase
- Vitest

## Local setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Fill in the Supabase project URL and anon key.
4. Apply the SQL files in `supabase/migrations/` to the target database.
5. Install dependencies with `npm install`.
6. Start the app with `npm run dev`.

## Commands

- `npm run dev` starts Vite locally.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run test` runs the Vitest suite.
- `npm run build` runs the production TypeScript build and Vite bundle.

## Environment

See `.env.example` for the client-side configuration names. Do not commit real credentials.

## Database

The base schema lives in `supabase/schema.sql`. Incremental changes belong in `supabase/migrations/` and should be applied in filename order.

## Notes

The application intentionally keeps authentication and authorization enforcement in Supabase policies and server-side RPCs. Client-side role checks are for presentation and user experience, not authorization.
