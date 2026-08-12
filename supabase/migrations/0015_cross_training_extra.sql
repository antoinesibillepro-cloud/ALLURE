alter table cross_training_logs add column if not exists avg_speed_kmh numeric(5,2);
alter table cross_training_logs add column if not exists time_slot text check (time_slot in ('matin', 'apres-midi'));
alter table cross_training_logs add column if not exists muscle_zones text[] not null default '{}';

create table if not exists strength_maxes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  exercise text not null,
  max_kg numeric(6,2) not null,
  updated_at timestamptz not null default now(),
  unique (profile_id, exercise)
);

alter table strength_maxes enable row level security;

create policy "athlete manages own strength maxes" on strength_maxes
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "coach reads club strength maxes" on strength_maxes
  for select using (
    my_role() = 'coach' and exists (
      select 1 from profiles p where p.id = strength_maxes.profile_id and p.club_id = my_club_id()
    )
  );
