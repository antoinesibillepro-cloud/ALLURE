-- Coach-managed race calendar: the coach creates races for the club and
-- assigns specific athletes to them, each with their own discipline
-- (e.g. one athlete runs the 1500m, another the 5000m, on the same date).

create table club_races (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  title text not null,
  event_date date not null,
  location text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index club_races_club_id_idx on club_races(club_id);

create table club_race_assignments (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references club_races(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  discipline text not null,
  target_time text,
  created_at timestamptz not null default now(),
  unique (race_id, profile_id, discipline)
);
create index club_race_assignments_race_id_idx on club_race_assignments(race_id);
create index club_race_assignments_profile_id_idx on club_race_assignments(profile_id);

alter table club_races enable row level security;
alter table club_race_assignments enable row level security;

create policy "read races in same club" on club_races
  for select using (club_id = my_club_id());
create policy "coach manages races" on club_races
  for all using (club_id = my_club_id() and my_role() = 'coach')
  with check (club_id = my_club_id() and my_role() = 'coach');

create policy "read race assignments in same club" on club_race_assignments
  for select using (exists (select 1 from club_races r where r.id = race_id and r.club_id = my_club_id()));
create policy "coach manages race assignments" on club_race_assignments
  for all using (my_role() = 'coach' and exists (select 1 from club_races r where r.id = race_id and r.club_id = my_club_id()))
  with check (my_role() = 'coach' and exists (select 1 from club_races r where r.id = race_id and r.club_id = my_club_id()));
