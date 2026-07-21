begin;

do $$
declare
  checked_table text;
begin
  foreach checked_table in array array[
    'players',
    'tournaments',
    'events',
    'event_participants',
    'matches',
    'match_results',
    'admin_profiles'
  ]
  loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = checked_table
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', checked_table;
    end if;

    if has_table_privilege('anon', format('public.%I', checked_table), 'insert')
      or has_table_privilege('anon', format('public.%I', checked_table), 'update')
      or has_table_privilege('anon', format('public.%I', checked_table), 'delete')
    then
      raise exception 'anon has write privileges on public.%', checked_table;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies policies
    where policies.schemaname = 'public'
      and policies.cmd = 'ALL'
      and coalesce(policies.qual, '') in ('true', '(true)')
  ) then
    raise exception 'An unrestricted FOR ALL policy exists';
  end if;

  if exists (
    select 1
    from information_schema.columns columns
    where columns.table_schema = 'public'
      and columns.table_name = 'players'
      and columns.column_name = 'email'
  ) then
    if has_column_privilege('anon', 'public.players', 'email', 'select') then
      raise exception 'anon can select players.email';
    end if;
  end if;

  if not has_function_privilege(
    'anon',
    'public.get_public_leaderboard(text, integer)',
    'execute'
  ) then
    raise exception 'anon cannot execute the safe public leaderboard function';
  end if;

  if not has_function_privilege(
    'anon',
    'public.get_public_tournaments()',
    'execute'
  ) then
    raise exception 'anon cannot execute the safe public tournaments function';
  end if;

  if has_table_privilege('anon', 'public.tournaments', 'select') then
    raise exception 'anon can select a base table directly';
  end if;

  if exists (
    select 1
    from pg_policies policies
    where policies.schemaname = 'public'
      and policies.tablename in (
        'players',
        'tournaments',
        'events',
        'event_participants',
        'matches',
        'match_results'
      )
      and policies.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and 'anon' = any(policies.roles)
  ) then
    raise exception 'anon has a mutation policy';
  end if;
end
$$;

rollback;
