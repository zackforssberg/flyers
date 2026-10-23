-- Core tables for Flyers HC statistics.

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  jersey_number int check (jersey_number between 0 and 99),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  played_at date not null,
  opponent text not null check (length(trim(opponent)) > 0),
  home_away text not null check (home_away in ('home', 'away')),
  opponent_score int not null check (opponent_score >= 0),
  player_of_match_id uuid references public.players (id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id),
  is_goalkeeper boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table public.penalty_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  default_minutes int not null check (default_minutes >= 0),
  created_at timestamptz not null default now()
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  type text not null check (type in ('goal', 'penalty')),
  period int not null check (period between 1 and 4),
  minute int check (minute between 0 and 99),
  player_id uuid not null references public.players (id),
  -- goal only
  assist1_player_id uuid references public.players (id),
  assist2_player_id uuid references public.players (id),
  -- penalty only
  penalty_type text,
  penalty_minutes int check (penalty_minutes >= 0),
  created_at timestamptz not null default now(),

  constraint match_events_fields_match_type check (
    (type = 'goal'
      and penalty_type is null
      and penalty_minutes is null)
    or
    (type = 'penalty'
      and assist1_player_id is null
      and assist2_player_id is null
      and penalty_type is not null
      and penalty_minutes is not null)
  ),
  constraint match_events_assist2_needs_assist1 check (
    assist2_player_id is null or assist1_player_id is not null
  ),
  constraint match_events_assists_differ_from_scorer check (
    (assist1_player_id is null or assist1_player_id <> player_id)
    and (assist2_player_id is null or assist2_player_id <> player_id)
    and (assist2_player_id is null or assist2_player_id <> assist1_player_id)
  )
);

create table public.dashboard_settings (
  key text primary key,
  enabled boolean not null default true
);

-- Row level security: public (anon) may only read. All writes go through
-- the service role on the server, which bypasses RLS.
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_events enable row level security;
alter table public.penalty_types enable row level security;
alter table public.dashboard_settings enable row level security;

create policy "Public read" on public.players for select to anon, authenticated using (true);
create policy "Public read" on public.matches for select to anon, authenticated using (true);
create policy "Public read" on public.match_players for select to anon, authenticated using (true);
create policy "Public read" on public.match_events for select to anon, authenticated using (true);
create policy "Public read" on public.penalty_types for select to anon, authenticated using (true);
create policy "Public read" on public.dashboard_settings for select to anon, authenticated using (true);

-- Indexes for the most common lookups.
create index match_players_player_id_idx on public.match_players (player_id);
create index match_events_match_id_idx on public.match_events (match_id);
create index match_events_player_id_idx on public.match_events (player_id);
create index matches_played_at_idx on public.matches (played_at desc, created_at desc);
