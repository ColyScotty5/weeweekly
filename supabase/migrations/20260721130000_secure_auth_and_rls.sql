begin;

-- Authenticated application administrators. Rows must be provisioned through a
-- trusted operator session (SQL editor, migration, or service-role process).
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  role text not null check (role in ('admin', 'super_admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_admin_profiles_updated_at on public.admin_profiles;
create trigger update_admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.update_updated_at_column();

alter table public.event_participants
  add column if not exists points_earned numeric(8, 1) not null default 0;

alter table public.event_participants
  alter column points_earned type numeric(8, 1)
  using points_earned::numeric(8, 1);

alter table public.event_participants
  drop constraint if exists event_participants_status_check;
alter table public.event_participants
  add constraint event_participants_status_check check (status in (
    'registered', 'active', 'eliminated', 'withdrawn',
    'winner', 'runner_up', 'semi_final', 'quarter_final', 'round_16', 'round_32',
    'consolation_winner', 'consolation_runner_up', 'consolation_semi_final',
    'consolation_quarter_final', 'consolation_round_16', 'consolation_round_32'
  ));

alter table public.players
  drop column if exists total_singles_points,
  drop column if exists total_doubles_points,
  drop column if exists singles_events_played,
  drop column if exists doubles_events_played,
  drop column if exists singles_ranking_points,
  drop column if exists doubles_ranking_points;

alter table public.players enable row level security;
alter table public.tournaments enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.matches enable row level security;
alter table public.match_results enable row level security;
alter table public.admin_profiles enable row level security;

create or replace function public.is_app_admin(required_role text default 'admin')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and (
        role = 'super_admin'
        or (required_role = 'admin' and role = 'admin')
      )
  );
$$;

revoke all on function public.is_app_admin(text) from public;
grant execute on function public.is_app_admin(text) to authenticated;

create or replace function public.current_app_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.admin_profiles
  where user_id = auth.uid();
$$;

revoke all on function public.current_app_admin_role() from public;
grant execute on function public.current_app_admin_role() to authenticated;

-- Remove legacy and drifted policies before installing the explicit policy set.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'players',
        'tournaments',
        'events',
        'event_participants',
        'matches',
        'match_results',
        'admin_profiles'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

-- Base tables are administrator-only. Anonymous readers use the deliberately
-- narrow security-definer functions below.
create policy admins_read_players on public.players
  for select to authenticated using (public.is_app_admin());
create policy admins_read_tournaments on public.tournaments
  for select to authenticated using (public.is_app_admin());
create policy admins_read_events on public.events
  for select to authenticated using (public.is_app_admin());
create policy admins_read_event_participants on public.event_participants
  for select to authenticated using (public.is_app_admin());
create policy admins_read_matches on public.matches
  for select to authenticated using (public.is_app_admin());
create policy admins_read_match_results on public.match_results
  for select to authenticated using (public.is_app_admin());

create policy admins_insert_players on public.players
  for insert to authenticated with check (public.is_app_admin());
create policy admins_update_players on public.players
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy super_admins_delete_players on public.players
  for delete to authenticated using (public.is_app_admin('super_admin'));

create policy admins_insert_tournaments on public.tournaments
  for insert to authenticated with check (public.is_app_admin());
create policy admins_update_tournaments on public.tournaments
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy super_admins_delete_tournaments on public.tournaments
  for delete to authenticated using (public.is_app_admin('super_admin'));

create policy admins_insert_events on public.events
  for insert to authenticated with check (public.is_app_admin());
create policy admins_update_events on public.events
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy super_admins_delete_events on public.events
  for delete to authenticated using (public.is_app_admin('super_admin'));

create policy admins_insert_event_participants on public.event_participants
  for insert to authenticated with check (public.is_app_admin());
create policy admins_update_event_participants on public.event_participants
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy admins_delete_event_participants on public.event_participants
  for delete to authenticated using (public.is_app_admin());

create policy admins_insert_matches on public.matches
  for insert to authenticated with check (public.is_app_admin());
create policy admins_update_matches on public.matches
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy super_admins_delete_matches on public.matches
  for delete to authenticated using (public.is_app_admin('super_admin'));

create policy admins_insert_match_results on public.match_results
  for insert to authenticated with check (public.is_app_admin());
create policy admins_update_match_results on public.match_results
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy super_admins_delete_match_results on public.match_results
  for delete to authenticated using (public.is_app_admin('super_admin'));

create policy admins_read_own_profile on public.admin_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_app_admin('super_admin'));
create policy super_admins_insert_profiles on public.admin_profiles
  for insert to authenticated with check (public.is_app_admin('super_admin'));
create policy admins_update_own_profile on public.admin_profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_app_admin('super_admin'))
  with check (
    (user_id = auth.uid() and role = public.current_app_admin_role())
    or public.is_app_admin('super_admin')
  );
create policy super_admins_delete_profiles on public.admin_profiles
  for delete to authenticated using (public.is_app_admin('super_admin'));

revoke all on table public.players from anon, authenticated;
revoke all on table public.tournaments from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_participants from anon, authenticated;
revoke all on table public.matches from anon, authenticated;
revoke all on table public.match_results from anon, authenticated;
revoke all on table public.admin_profiles from anon, authenticated;

grant select (id, name) on public.players to authenticated;
grant insert, update, delete on public.players to authenticated;
grant select, insert, update, delete on public.tournaments, public.events,
  public.event_participants, public.matches, public.match_results to authenticated;
grant select, insert, update, delete on public.admin_profiles to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.get_public_tournaments()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'tournament_date', t.tournament_date,
        'status', t.status,
        'description', t.description,
        'events', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', e.id,
              'event_type', e.event_type,
              'max_participants', e.max_participants,
              'status', e.status,
              'participant_count', (
                select count(*)
                from public.event_participants ep
                where ep.event_id = e.id
              )
            )
            order by e.event_type
          )
          from public.events e
          where e.tournament_id = t.id
        ), '[]'::jsonb)
      )
      order by t.tournament_date desc
    ),
    '[]'::jsonb
  )
  from public.tournaments t;
$$;

revoke all on function public.get_public_tournaments() from public;
grant execute on function public.get_public_tournaments() to anon, authenticated;

create or replace function public.get_public_leaderboard(
  requested_event_type text,
  within_months integer default 12
)
returns table (
  id bigint,
  name text,
  total_points numeric,
  events_played bigint,
  cd numeric,
  rank_points numeric,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select
      p.id,
      p.name,
      sum(ep.points_earned)::numeric as total_points,
      count(*)::bigint as events_played
    from public.event_participants ep
    join public.players p on p.id = ep.player_id
    join public.events e on e.id = ep.event_id
    join public.tournaments t on t.id = e.tournament_id
    where e.status = 'completed'
      and e.event_type = requested_event_type
      and t.tournament_date >= (current_date - make_interval(months => greatest(within_months, 1)))
    group by p.id, p.name
  ),
  scored as (
    select
      totals.*,
      (1.5 + events_played * 0.5)::numeric as cd,
      (total_points / (1.5 + events_played * 0.5))::numeric as rank_points
    from totals
  )
  select
    scored.id,
    scored.name,
    scored.total_points,
    scored.events_played,
    scored.cd,
    scored.rank_points,
    rank() over (order by scored.rank_points desc, scored.total_points desc, scored.name)::bigint
  from scored
  order by rank_points desc, total_points desc, name;
$$;

revoke all on function public.get_public_leaderboard(text, integer) from public;
grant execute on function public.get_public_leaderboard(text, integer) to anon, authenticated;

commit;
