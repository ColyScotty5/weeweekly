begin;

create table if not exists public.players (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id bigserial primary key,
  name text not null,
  tournament_date date not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'in_progress', 'completed', 'cancelled')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigserial primary key,
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  event_type text not null check (event_type in ('singles', 'doubles')),
  max_participants integer,
  status text not null default 'registration'
    check (status in ('registration', 'draw_created', 'in_progress', 'completed')),
  draw_structure jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_participants (
  id bigserial primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  partner_id bigint references public.players(id) on delete cascade,
  seed_position integer,
  status text not null default 'registered'
    check (status in (
      'registered', 'active', 'eliminated', 'withdrawn',
      'winner', 'runner_up', 'semi_final', 'quarter_final', 'round_16', 'round_32',
      'consolation_winner', 'consolation_runner_up', 'consolation_semi_final',
      'consolation_quarter_final', 'consolation_round_16', 'consolation_round_32'
    )),
  registered_at timestamptz not null default now(),
  unique (event_id, player_id)
);

create table if not exists public.matches (
  id bigserial primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  player1_id bigint references public.players(id),
  player2_id bigint references public.players(id),
  player1_partner_id bigint references public.players(id),
  player2_partner_id bigint references public.players(id),
  round_name text not null,
  bracket_type text not null check (bracket_type in ('main', 'consolation')),
  match_number integer,
  bracket_position integer,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'walkover', 'cancelled')),
  score text,
  winner_id bigint references public.players(id),
  scheduled_time timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.match_results (
  id bigserial primary key,
  match_id bigint not null references public.matches(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  points_earned integer not null default 0,
  result_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tournaments_date on public.tournaments(tournament_date);
create index if not exists idx_events_tournament on public.events(tournament_id);
create index if not exists idx_event_participants_event on public.event_participants(event_id);
create index if not exists idx_event_participants_player on public.event_participants(player_id);
create index if not exists idx_matches_event on public.matches(event_id);
create index if not exists idx_matches_players on public.matches(player1_id, player2_id);
create index if not exists idx_match_results_match on public.match_results(match_id);
create index if not exists idx_match_results_player on public.match_results(player_id);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_players_updated_at on public.players;
drop trigger if exists update_tournaments_updated_at on public.tournaments;
drop trigger if exists update_events_updated_at on public.events;

create trigger update_players_updated_at
  before update on public.players
  for each row execute function public.update_updated_at_column();
create trigger update_tournaments_updated_at
  before update on public.tournaments
  for each row execute function public.update_updated_at_column();
create trigger update_events_updated_at
  before update on public.events
  for each row execute function public.update_updated_at_column();

commit;
