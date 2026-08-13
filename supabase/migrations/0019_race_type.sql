alter table club_races add column if not exists race_type text not null default 'piste'
  check (race_type in ('piste', 'route', 'cross', 'trail', 'stage'));
