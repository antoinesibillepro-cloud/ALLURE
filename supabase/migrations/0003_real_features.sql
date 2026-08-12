-- Backing tables for features that were still mocked in the UI:
-- objectives/competitions, weight tracking, injury history, notification prefs.

create type competition_kind as enum ('competition', 'objective');

create table competitions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind competition_kind not null,
  title text not null,
  event_date date,
  distance_km numeric(6,2),
  target_time text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index competitions_profile_id_idx on competitions(profile_id);

create table weight_logs (
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null,
  primary key (profile_id, date)
);

create type injury_severity as enum ('légère', 'modérée', 'grave');

create table injuries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  date date not null,
  duration_text text,
  severity injury_severity not null default 'légère',
  created_at timestamptz not null default now()
);

alter table profiles add column notification_prefs jsonb not null default '{"messages": true, "sessions": true, "reminders": false, "competitions": true}';

alter table competitions enable row level security;
alter table weight_logs enable row level security;
alter table injuries enable row level security;

create policy "athlete manages own competitions" on competitions
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "coach reads club competitions" on competitions
  for select using (my_role() = 'coach' and exists (select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id()));

create policy "athlete manages own weight logs" on weight_logs
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "athlete manages own injuries" on injuries
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "coach reads club injuries" on injuries
  for select using (my_role() = 'coach' and exists (select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id()));
