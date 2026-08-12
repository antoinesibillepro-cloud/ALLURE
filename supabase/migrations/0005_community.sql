-- Community challenges: coach creates a km/sessions/attendance goal for the
-- club (or one group), athletes' progress is computed from real
-- session_completions data rather than tracked separately.

create type challenge_kind as enum ('km', 'sessions', 'attendance');

create table challenges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  created_by uuid not null references profiles(id),
  title text not null,
  kind challenge_kind not null,
  target_value numeric not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create index challenges_club_id_idx on challenges(club_id);

alter table challenges enable row level security;

create policy "read challenges in same club" on challenges
  for select using (club_id = my_club_id());
create policy "coach manages challenges" on challenges
  for all using (club_id = my_club_id() and my_role() = 'coach')
  with check (club_id = my_club_id() and my_role() = 'coach');
