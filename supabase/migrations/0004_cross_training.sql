-- Cross-training log: vélo, natation, musculation, gainage — one simple table,
-- the athlete logs an entry and it feeds the "Croisé"/"Musculation" screens
-- and the discipline breakdown in Stats.

create type cross_training_discipline as enum ('velo', 'natation', 'musculation', 'gainage');

create table cross_training_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  discipline cross_training_discipline not null,
  date date not null,
  duration_min int not null,
  distance_km numeric(6,2),
  rpe int check (rpe between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);

create index cross_training_logs_profile_id_idx on cross_training_logs(profile_id, date desc);

alter table cross_training_logs enable row level security;

create policy "athlete manages own cross training logs" on cross_training_logs
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "coach reads club cross training logs" on cross_training_logs
  for select using (
    my_role() = 'coach' and exists (
      select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id()
    )
  );

-- While we're here: session_completions.rpe was never actually settable from the
-- UI, which means "charge d'entraînement" (RPE × durée) never had real data.
-- No schema change needed, just note that validateSession()/logFreeSession()
-- need to start passing it through.
