-- Athlete-reported realized data on a completed session (distance/duration
-- may differ from what the coach planned), plus per-rep splits (e.g. the
-- 4 individual times of a "4x400m") — both visible to the coach.

alter table session_completions add column if not exists actual_distance_km numeric(5,2);
alter table session_completions add column if not exists actual_duration_min int;

create table session_splits (
  id uuid primary key default gen_random_uuid(),
  session_completion_id uuid not null references session_completions(id) on delete cascade,
  rep_number int not null,
  time_seconds numeric(6,2) not null,
  created_at timestamptz not null default now(),
  unique (session_completion_id, rep_number)
);
create index session_splits_completion_id_idx on session_splits(session_completion_id);

alter table session_splits enable row level security;

create policy "athlete manages own splits" on session_splits
  for all using (
    exists (select 1 from session_completions sc where sc.id = session_completion_id and sc.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from session_completions sc where sc.id = session_completion_id and sc.profile_id = auth.uid())
  );

create policy "coach reads splits in same club" on session_splits
  for select using (
    my_role() = 'coach' and exists (
      select 1 from session_completions sc
      join profiles p on p.id = sc.profile_id
      where sc.id = session_completion_id and p.club_id = my_club_id()
    )
  );

-- ── Badges ────────────────────────────────────────────────────────────
create table badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon_key text not null,
  criteria_kind text not null, -- 'total_km' | 'streak_weeks' | 'records_count' | 'sessions_month'
  criteria_value numeric not null
);

create table athlete_badges (
  profile_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

alter table badges enable row level security;
alter table athlete_badges enable row level security;

create policy "badges readable by all authenticated" on badges
  for select using (auth.uid() is not null);

create policy "read athlete badges in same club" on athlete_badges
  for select using (
    exists (select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id())
  );

create policy "athlete awards own badges" on athlete_badges
  for insert with check (profile_id = auth.uid());

insert into badges (code, title, description, icon_key, criteria_kind, criteria_value) values
  ('km_100', 'Centurion', '100 km cumulés', 'flame', 'total_km', 100),
  ('km_500', 'Grand routier', '500 km cumulés', 'mountain', 'total_km', 500),
  ('km_1000', 'Endurant', '1000 km cumulés', 'mountain', 'total_km', 1000),
  ('streak_4', 'Sur la lancée', '4 semaines consécutives avec au moins une séance', 'flame', 'streak_weeks', 4),
  ('streak_8', 'Régularité', '8 semaines consécutives avec au moins une séance', 'star', 'streak_weeks', 8),
  ('records_3', 'PR Machine', '3 records personnels enregistrés', 'trophy', 'records_count', 3)
on conflict (code) do nothing;
