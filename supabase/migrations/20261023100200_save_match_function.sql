-- Creates or replaces a match, its lineup and its events in one transaction.
-- Called only from the server with the service role.

create or replace function public.save_match(
  p_match_id uuid,
  p_match jsonb,
  p_lineup jsonb,
  p_events jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_match_id uuid := p_match_id;
  v_lineup_ids uuid[];
begin
  select coalesce(array_agg((x->>'player_id')::uuid), '{}')
    into v_lineup_ids
  from jsonb_array_elements(p_lineup) x;

  -- Every player referenced by an event must be in the lineup.
  if exists (
    select 1
    from jsonb_array_elements(p_events) e
    where not ((e->>'player_id')::uuid = any (v_lineup_ids))
       or (nullif(e->>'assist1_player_id', '') is not null
           and not ((e->>'assist1_player_id')::uuid = any (v_lineup_ids)))
       or (nullif(e->>'assist2_player_id', '') is not null
           and not ((e->>'assist2_player_id')::uuid = any (v_lineup_ids)))
  ) then
    raise exception 'Every player in an event must be in the lineup'
      using errcode = 'check_violation';
  end if;

  if v_match_id is null then
    insert into public.matches (
      played_at, opponent, home_away, opponent_score, player_of_match_id, notes
    )
    values (
      (p_match->>'played_at')::date,
      p_match->>'opponent',
      p_match->>'home_away',
      (p_match->>'opponent_score')::int,
      nullif(p_match->>'player_of_match_id', '')::uuid,
      nullif(p_match->>'notes', '')
    )
    returning id into v_match_id;
  else
    update public.matches
    set
      played_at = (p_match->>'played_at')::date,
      opponent = p_match->>'opponent',
      home_away = p_match->>'home_away',
      opponent_score = (p_match->>'opponent_score')::int,
      player_of_match_id = nullif(p_match->>'player_of_match_id', '')::uuid,
      notes = nullif(p_match->>'notes', '')
    where id = v_match_id;

    if not found then
      raise exception 'Match not found' using errcode = 'no_data_found';
    end if;

    delete from public.match_events where match_id = v_match_id;
    delete from public.match_players where match_id = v_match_id;
  end if;

  insert into public.match_players (match_id, player_id, is_goalkeeper)
  select
    v_match_id,
    (x->>'player_id')::uuid,
    coalesce((x->>'is_goalkeeper')::boolean, false)
  from jsonb_array_elements(p_lineup) x;

  insert into public.match_events (
    match_id, type, period, minute, player_id,
    assist1_player_id, assist2_player_id, penalty_type, penalty_minutes
  )
  select
    v_match_id,
    e->>'type',
    (e->>'period')::int,
    nullif(e->>'minute', '')::int,
    (e->>'player_id')::uuid,
    nullif(e->>'assist1_player_id', '')::uuid,
    nullif(e->>'assist2_player_id', '')::uuid,
    nullif(e->>'penalty_type', ''),
    nullif(e->>'penalty_minutes', '')::int
  from jsonb_array_elements(p_events) e;

  return v_match_id;
end;
$$;

revoke execute on function public.save_match(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_match(uuid, jsonb, jsonb, jsonb) to service_role;
