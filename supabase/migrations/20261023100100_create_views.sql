-- Read models used by the public pages. security_invoker makes the views
-- respect the caller's RLS policies instead of the view owner's.

-- Our score per match is the number of goal events in that match.
create view public.match_results with (security_invoker = true) as
select
  m.id as match_id,
  m.played_at,
  m.opponent,
  m.home_away,
  m.opponent_score,
  m.player_of_match_id,
  (
    select count(*)::int
    from public.match_events e
    where e.match_id = m.id and e.type = 'goal'
  ) as our_score
from public.matches m;

-- Season totals per player (all players, including those with zero stats).
create view public.player_stats with (security_invoker = true) as
with game_counts as (
  select player_id, count(*)::int as games_played
  from public.match_players
  group by player_id
),
goal_counts as (
  select player_id, count(*)::int as goals
  from public.match_events
  where type = 'goal'
  group by player_id
),
assist_counts as (
  select assisting.player_id, count(*)::int as assists
  from (
    select assist1_player_id as player_id
    from public.match_events
    where type = 'goal' and assist1_player_id is not null
    union all
    select assist2_player_id
    from public.match_events
    where type = 'goal' and assist2_player_id is not null
  ) assisting
  group by assisting.player_id
),
penalty_counts as (
  select
    player_id,
    count(*)::int as penalty_count,
    coalesce(sum(penalty_minutes), 0)::int as penalty_minutes
  from public.match_events
  where type = 'penalty'
  group by player_id
)
select
  p.id as player_id,
  p.name,
  p.jersey_number,
  p.active,
  coalesce(g.games_played, 0) as games_played,
  coalesce(gc.goals, 0) as goals,
  coalesce(ac.assists, 0) as assists,
  coalesce(gc.goals, 0) + coalesce(ac.assists, 0) as points,
  coalesce(pc.penalty_count, 0) as penalty_count,
  coalesce(pc.penalty_minutes, 0) as penalty_minutes
from public.players p
left join game_counts g on g.player_id = p.id
left join goal_counts gc on gc.player_id = p.id
left join assist_counts ac on ac.player_id = p.id
left join penalty_counts pc on pc.player_id = p.id;

-- Players with points (goals + assists) in the two most recently played matches.
create view public.hot_players with (security_invoker = true) as
with recent_matches as (
  select id
  from public.matches
  order by played_at desc, created_at desc
  limit 2
),
recent_goals as (
  select player_id, assist1_player_id, assist2_player_id
  from public.match_events
  where type = 'goal'
    and match_id in (select id from recent_matches)
),
goal_counts as (
  select player_id, count(*)::int as goals
  from recent_goals
  group by player_id
),
assist_counts as (
  select assisting.player_id, count(*)::int as assists
  from (
    select assist1_player_id as player_id from recent_goals where assist1_player_id is not null
    union all
    select assist2_player_id from recent_goals where assist2_player_id is not null
  ) assisting
  group by assisting.player_id
)
select
  p.id as player_id,
  p.name,
  coalesce(gc.goals, 0) as goals,
  coalesce(ac.assists, 0) as assists,
  coalesce(gc.goals, 0) + coalesce(ac.assists, 0) as points
from public.players p
left join goal_counts gc on gc.player_id = p.id
left join assist_counts ac on ac.player_id = p.id
where coalesce(gc.goals, 0) + coalesce(ac.assists, 0) > 0
order by points desc, goals desc, p.name asc;
