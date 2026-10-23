# Handoff: Flyers HC statistics site

Read this first when you start a new session (on any machine). It records what was
built, what was verified, what was decided and why, and what is still open.
The short project overview is in `README.md`. Next.js rules for this repo are in
`AGENTS.md`: this is Next 16.4.2, so check `node_modules/next/dist/docs/` before
writing Next code.

**Never put secrets in this file or in git.** Keys and passwords live only in
`.env.local` (gitignored) and in the Supabase dashboard.

---

## 1. What the project is

A statistics site for the ice hockey team Flyers HC (div 4). It stores matches,
goals, assists, penalties, lineups and player of the match, and shows them on a
public site. Admins log matches from a phone.

Language rules (from the original brief, in Swedish):
- All code, identifiers, SQL, comments, commit messages and README are **English**.
- Everything a visitor or admin sees is **Swedish**, and lives in `lib/strings.ts`.
- `<html lang="sv">`.

Stack: Next.js 16.4.2 (App Router, Turbopack), TypeScript, Tailwind v4,
Supabase (Postgres) via `@supabase/supabase-js`, plus the `server-only` package.
Hosting target: Vercel.

Design: primary `#1B4099`, surface `#EBF4FD`, mobile first, Tailwind tokens
`flyers-blue`, `flyers-ice`, `flyers-ink`, `flyers-muted`, `flyers-line` in
`app/globals.css`.

---

## 2. Current status

| Area | Status |
| --- | --- |
| Database schema, views, RPC, seed (migrations in `supabase/migrations/`) | Written, verified in PGlite, **applied to dev via the Supabase dashboard SQL editor** |
| Public pages `/`, `/poang`, `/matcher`, `/utvisningar` | Built, render correctly against dev (empty state) |
| Admin page at `/<ADMIN_PATH_SECRET>` | Built, login page renders. **Login and data writes not yet tested live** |
| `proxy.ts` (secret path rewrite, direct `/admin` → 404) | Built and tested on a production server |
| Local env (`.env.local`) | Created and filled by the user |
| Supabase CLI | Logged in locally and linked to dev (`supabase/.temp/project-ref`) |
| `db push` to dev | **Not done by the CLI.** The DB ports are blocked on the current network (see §5) |
| Prod Supabase project | **Not touched.** Prod ref not yet provided |
| Vercel | Not configured yet |
| Git | Nothing committed by us. All work is uncommitted on `master` |

Supabase project refs:
- Dev: `hbbjwoulxebhrbzomhlx` (name `flyers-dev`)
- Prod: **unknown**, ask the user

---

## 3. Repository layout

```
proxy.ts                         secret admin path rewrite; blocks direct /admin
app/
  layout.tsx                     html lang="sv", header, metadata
  globals.css                    Tailwind v4 tokens
  page.tsx                       / dashboard (7 switchable widgets)
  poang/page.tsx                 /poang (?stat=points|goals|assists)
  utvisningar/page.tsx           /utvisningar
  matcher/page.tsx               /matcher (expandable <details> per match)
  error.tsx, not-found.tsx       Swedish error and 404 pages
  admin/
    layout.tsx                   robots noindex
    page.tsx                     admin UI; tabs via ?tab=
    actions.ts                   'use server' writes; each checks the admin session
components/
  site-header.tsx, ui.tsx
  admin/match-form.tsx           client form: match + lineup + events, live score
  admin/sections.tsx             login, settings, players, penalty types, matches list
  admin/confirm-submit.tsx       client confirm() before delete
lib/
  strings.ts                     ALL Swedish UI text
  types.ts                       row and form types (no server-only, safe for client)
  format.ts                      Swedish dates, V/O/F outcome
  match-validation.ts            match rules, used by the server action
  queries.ts                     read helpers (take a Supabase client)
  supabase.ts                    anon client and service-role client (server-only)
  admin-auth.ts                  HMAC-signed admin session cookie (server-only)
supabase/
  config.toml                    from `supabase init`
  migrations/
    20261023100000_create_tables.sql
    20261023100100_create_views.sql
    20261023100200_save_match_function.sql
    20261023100300_seed_defaults.sql
docs/HANDOFF.md                  this file
.env.example                     variable names only (gitignore exception: !.env.example)
```

Dependencies added: `@supabase/supabase-js`, `server-only`, and dev dep `supabase`
(`^2.121.0`, the CLI, invoked as `pnpm supabase ...`).

---

## 4. Data model (short)

- `players` (id, name, jersey_number 0–99 nullable, active)
- `matches` (id, played_at date, opponent, home_away home|away, opponent_score, player_of_match_id, notes)
- `match_players` (match_id, player_id, is_goalkeeper), unique (match_id, player_id)
- `match_events`: `type` goal|penalty, `period` 1–4 (4 = overtime), `minute` 0–99 nullable.
  - goal: player_id (scorer), assist1/assist2 nullable. Check constraints: assist2 needs assist1; assists differ from scorer and from each other.
  - penalty: player_id, penalty_type (text, a snapshot of the name), penalty_minutes.
- `penalty_types` (name unique, default_minutes), seeded with 12 Swedish types
- `dashboard_settings` (key, enabled), seeded with 7 widget keys, all true
- Views (`security_invoker = true`): `match_results` (our_score = goal count),
  `player_stats` (GP from lineups, goals, assists, points, penalties),
  `hot_players` (points in the 2 most recent matches, tiebreak goals then name)
- Function `save_match(p_match_id, p_match jsonb, p_lineup jsonb, p_events jsonb)`:
  one transaction, replaces lineup and events on edit, checks every event player
  is in the lineup. `EXECUTE` is granted to `service_role` only.
- RLS on all tables. `anon` and `authenticated` get `SELECT` only.

Our score is never stored; it is always the count of goal events.

---

## 5. Supabase and CLI: what happened

1. The user's CLI access token was pasted into the chat twice. **It must be
   revoked** at https://supabase.com/dashboard/account/tokens. The CLI keeps a
   login locally (`pnpm supabase login --token ...` was run). After rotating,
   run `pnpm supabase login --token <new>` on each machine.
2. `pnpm supabase login` (browser flow) cannot run in a non-TTY shell (Claude Code's
   bash tool, or the `!` prefix). Use `--token` or run it in a real terminal.
3. `pnpm supabase link --project-ref hbbjwoulxebhrbzomhlx` **succeeded**.
4. `pnpm supabase db push` **hung at "Initialising login role..."**. From the
   user's network, outbound TCP 5432 and 6543 to `aws-0-eu-west-1.pooler.supabase.com`
   are blocked (HTTPS to the API works). This is likely a corporate firewall. The
   pooler URL is in `supabase/.temp/pooler-url`. Alternatives:
   - Try another network (phone hotspot) and run `pnpm supabase db push`, or
   - Ask IT to allow outbound 5432 and 6543 to `*.pooler.supabase.com`.
5. The user applied all four migrations through the **dashboard SQL editor** instead.
   The schema, seed data, views and RLS were verified over HTTPS with the anon key:
   all tables respond, the 12 penalty types and 7 dashboard rows exist, an anon
   insert returns 401.
6. **Migration history is not recorded.** The CLI's migration table does not know
   about these four. A later `db push` will try to create the tables again and
   fail. Fix once the DB port is reachable:
   ```
   pnpm supabase migration repair --status applied 20261023100000 20261023100100 20261023100200 20261023100300
   ```
   This is unverified without a DB connection. Check `pnpm supabase migration list`
   first.

Dev project check over HTTPS (no secrets printed): read `.env.local` into the
environment, then `curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/<table>?select=*&limit=3"`.

---

## 6. Testing done (and not done)

Done:
- `pnpm exec tsc --noEmit` passes. `pnpm lint` passes.
- `pnpm build` passes (run with real `.env.local`, or with placeholder env values).
- Migrations applied to an in-memory Postgres (PGlite): `db/test` script in the
  scratchpad, not in the repo. Results: views correct, `save_match` rejects a
  lineup violation, anon insert blocked. This caught a real bug (`null is distinct
  from null` in the assist constraint), now fixed. Worth recreating if you change SQL.
- Production server smoke test: `/admin` → 404, `/<secret>` → 200 with `noindex`, unknown path → 404.
- Dev server against dev Supabase: `/`, `/poang`, `/matcher`, `/utvisningar` → 200 with empty states.
- Admin login page via secret path → 200 with no prerender error (after the fix below).

Not done yet (next steps, in order):
1. **Log in and test the admin flow on dev**: add 2–3 players, log a match with
   goals, assists, a penalty, lineup and player of the match. Check the public pages
   update. Then edit and delete the match. Check the penalty-types and dashboard-switch forms too.
2. Fix `db migration repair` history (see §5).
3. Ask the user for the **prod project ref**, then push migrations to prod only
   after step 1 passes. Relink to dev afterwards.
4. Configure Vercel (see §8). Commit and push (see §9).

---

## 7. Decisions and why

- **Admin password doubles as the session signing key** (HMAC-SHA256 with
  `ADMIN_PASSWORD`). This avoids a fifth secret. Changing the password logs out everyone.
  Sessions last 7 days, cookie is `httpOnly`, `sameSite=strict`, `secure` in production.
- **Secret path via `proxy.ts`**: `/<ADMIN_PATH_SECRET>` is rewritten to the internal
  `/admin` route with a marker header `x-flyers-admin-rewrite: 1`. Direct `/admin`
  without that header returns a bare 404. The header can be spoofed, but it only
  reaches the login form, which still requires the password.
- **Two Supabase clients**: anon for public reads (RLS enforced), service role for
  admin writes and admin reads. The service role key is only imported in server files
  guarded by `import "server-only"`.
- **Writes go through a server action** that checks the admin session first. Match
  saves use an RPC so the lineup, events and match are atomic.
- **Validation lives in two places**: `lib/match-validation.ts` for user-friendly
  Swedish messages, and the SQL function and constraints as a safety net.
- **Errors from redirect-based forms** are passed as keys in `?error=<key>` and
  mapped to Swedish text via `strings.errors`. The match form (client) returns a
  result object instead, because it needs to stay on the page on error.
- **Penalty type name is copied into each event** (`penalty_type text`), so renaming
  a type doesn't rewrite history.
- **Dashboard and stats are computed in SQL views**, not stored. Only raw events are stored.
- **`cacheComponents: true`** is enabled in `next.config.ts` (already in the scaffold).
  This forces every request-time read into `<Suspense>`. Every page wraps its data
  component in Suspense.
- **`connection()`** is awaited at the top of the admin content component. Without it,
  `Date.now()` in the session check fails during prerender ("Blocking Route" error).

---

## 8. Known gotchas

- `cacheComponents` is on. Any new page that reads data or cookies needs a `<Suspense>`
  boundary, or the build fails. Time-dependent code needs `await connection()` first.
- Next 16 uses `proxy.ts` (not `middleware.ts`), and it exports `proxy`. Check
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- Next page files may not export anything except the page and metadata or config values.
- `.env*` is gitignored. `.env.example` is re-included with `!.env.example`.
- `next-env.d.ts` is gitignored.
- The admin page loads all tables on each request. Fine for this data size.
- `strings.errors.matchRequiredEvents` is unused. Remove it or use it.
- The `/admin` 404 is a bare response with no body, on purpose.
- Only one `next dev` can run per project. If port 3000 is busy, another dev server
  is running (check `Get-NetTCPConnection -LocalPort 3000`).
- The Supabase CLI prints "A new version is available" (2.122.0). Not blocking.
- Vercel does not run migrations. Push them with the CLI first.

---

## 9. Commands

```bash
pnpm install
pnpm dev                       # http://localhost:3000
pnpm exec tsc --noEmit
pnpm lint
pnpm build

# Supabase CLI (project-local, pinned)
pnpm supabase login --token <token>                 # token from dashboard, never commit it
pnpm supabase link --project-ref hbbjwoulxebhrbzomhlx    # dev
pnpm supabase db push                              # needs DB port access + DB password
pnpm supabase migration list
pnpm supabase migration new <name>                 # new migration file
```

Prod (only after dev is verified):
```bash
pnpm supabase link --project-ref <PROD_REF>
pnpm supabase db push
pnpm supabase link --project-ref hbbjwoulxebhrbzomhlx   # relink to dev afterwards
```

Vercel checklist:
1. Import the repo. Set the 5 env vars for Production (prod values):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (secret), `ADMIN_PASSWORD`, `ADMIN_PATH_SECRET`.
2. Deploy. Check the public pages and that `/admin` returns 404 and the secret path shows login.
3. Keep `ADMIN_PATH_SECRET` out of any public place.

---

## 10. Resuming on another device

1. Pull the repo. Read this file, then `README.md`, then `AGENTS.md`.
2. `pnpm install`. Create `.env.local` from `.env.example`. Ask the user for the values
   (they should copy them from their own Supabase and Vercel dashboards). Never ask the
   user to paste keys into chat.
3. Log in to the Supabase CLI on that machine with a new token if needed.
4. Check `git status`, and check `pnpm supabase migration list` against the
   dev database before pushing anything.
5. Continue from §6 "Not done yet".

Open questions for the user: prod project ref; whether to commit and push these changes;
whether the admin flow works on dev.
