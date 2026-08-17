-- Weekly recurring availability an athlete can set for themselves (can only
-- train mornings, only afternoons, or not at all on a given weekday), so the
-- coach knows before scheduling. weekday follows the app's existing Monday=0
-- convention ((date.getDay()+6)%7), used throughout the calendar code.
create table athlete_availabilities (
  profile_id uuid not null references profiles(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  matin boolean not null default true,
  apres_midi boolean not null default true,
  primary key (profile_id, weekday)
);

alter table athlete_availabilities enable row level security;

create policy "athlete manages own availability" on athlete_availabilities
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "coach reads club availability" on athlete_availabilities
  for select using (
    my_role() = 'coach' and exists (select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id())
  );
