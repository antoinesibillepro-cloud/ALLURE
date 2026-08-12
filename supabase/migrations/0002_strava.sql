-- Strava integration: per-athlete OAuth tokens + synced activities.
-- Tokens are only ever written/read by server-side code (Vercel functions
-- using the service role key), never by the browser client directly.

create table strava_accounts (
  profile_id uuid primary key references profiles(id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null,
  connected_at timestamptz not null default now()
);

create table strava_activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  strava_id bigint not null unique,
  name text not null,
  type text not null,
  distance_m numeric not null default 0,
  moving_time_s int not null default 0,
  start_date timestamptz not null,
  created_at timestamptz not null default now()
);

create index strava_activities_profile_id_idx on strava_activities(profile_id, start_date desc);

alter table strava_accounts enable row level security;
alter table strava_activities enable row level security;

-- strava_accounts: no client policies at all — only the service role (server-side
-- Vercel functions) ever touches this table, so RLS with zero policies just
-- means "authenticated clients get nothing," which is what we want for tokens.

-- strava_activities: athlete reads their own; coach reads their club's athletes'.
create policy "athlete reads own strava activities" on strava_activities
  for select using (profile_id = auth.uid());
create policy "coach reads club strava activities" on strava_activities
  for select using (
    my_role() = 'coach' and exists (
      select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id()
    )
  );
