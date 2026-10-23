# Flyers HC – statistics

Statistics site for the Flyers HC ice hockey team (div 4): match results, goals,
assists, penalties, lineups and player of the match. The public site and all UI
text are in Swedish; code, database and comments are in English.

Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres).

## Running locally

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | server | Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public pages | Read-only through RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | admin actions | Secret. Server only, never `NEXT_PUBLIC_`. |
| `ADMIN_PASSWORD` | admin login | Also the key that signs admin sessions. Changing it logs everyone out. |
| `ADMIN_PATH_SECRET` | `proxy.ts` | The admin page is served at `/<ADMIN_PATH_SECRET>`. Direct `/admin` returns 404. |

The admin page is not linked from anywhere and is marked `noindex`.

## Database

Schema changes live in `supabase/migrations/` and are applied with the Supabase CLI.
The same migrations run on dev and prod.

- Tables: `players`, `matches`, `match_players`, `match_events`, `penalty_types`, `dashboard_settings`.
- Views (`security_invoker`): `match_results`, `player_stats`, `hot_players`.
- Function `save_match(...)`: writes a match, its lineup and its events in one transaction. Callable by `service_role` only.
- RLS is enabled on every table. `anon` and `authenticated` may only `SELECT`.

### Create a migration

```bash
pnpm supabase migration new <short_description>
```

Edit the new file in `supabase/migrations/`, then apply it as described below.

### Push to dev

```bash
pnpm supabase link --project-ref <DEV_PROJECT_REF>
pnpm supabase db push
```

### Push to prod

Only after the change is verified on dev:

```bash
pnpm supabase link --project-ref <PROD_PROJECT_REF>
pnpm supabase db push
```

Relink to dev afterwards (`pnpm supabase link --project-ref <DEV_PROJECT_REF>`) so
that later commands do not hit prod by accident.

## Deploying (Vercel)

1. Import the repository in Vercel.
2. Add the five environment variables above for the Production environment (prod project values).
3. Deploy. Migrations are not run by Vercel; push them with the Supabase CLI first.

## Project layout

- `app/` – pages. `/` dashboard, `/matcher`, `/poang`, `/utvisningar`, and `/admin` (reached via the secret path).
- `app/admin/actions.ts` – server actions for all writes. Each checks the admin session first.
- `proxy.ts` – rewrites the secret admin path and blocks direct `/admin` access.
- `lib/strings.ts` – all Swedish user-facing text.
- `lib/match-validation.ts` – match input rules, shared by the form and the server.
- `lib/queries.ts` – read helpers.
- `supabase/migrations/` – schema, views, RPC and seed data.
