-- Default data: penalty types and dashboard widget switches.

insert into public.penalty_types (name, default_minutes) values
  ('Hakning', 2),
  ('Slashing', 2),
  ('Hooking', 2),
  ('Interference', 2),
  ('Tripping', 2),
  ('Roughing', 2),
  ('Hög klubba', 4),
  ('För många spelare', 2),
  ('Fördröjning av spelet', 2),
  ('Misconduct', 10),
  ('Matchstraff', 20),
  ('Övrigt', 2)
on conflict (name) do nothing;

insert into public.dashboard_settings (key, enabled) values
  ('latest_results', true),
  ('top_scorer', true),
  ('points_league', true),
  ('assists_league', true),
  ('latest_motm', true),
  ('bad_boys', true),
  ('hot_players', true)
on conflict (key) do nothing;
