-- Coaching app — Phase 1 schema
-- Un seul club pour le pilote, mais club_id partout pour préparer le multi-club.

create extension if not exists "pgcrypto";

-- ── Clubs ──────────────────────────────────────────────────────────────
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  primary_color text not null default '#F2C400',
  created_at timestamptz not null default now()
);

-- ── Profiles (1:1 avec auth.users) ───────────────────────────────────────
create type user_role as enum ('athlete', 'coach');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  role user_role not null default 'athlete',
  name text not null,
  avatar_url text,
  email text not null,
  vma numeric(4,1),
  ffa_licence_url text,
  category text,
  created_at timestamptz not null default now()
);

create index profiles_club_id_idx on profiles(club_id);

-- ── Invite codes ──────────────────────────────────────────────────────
-- Signup never lets a user pick their own club_id/role directly (see RLS below);
-- it must go through an invite code resolved by the join_club_with_invite() RPC.
create table club_invites (
  code text primary key,
  club_id uuid not null references clubs(id) on delete cascade,
  role user_role not null,
  max_uses int not null default 1,
  uses int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Groups ────────────────────────────────────────────────────────────
create table groups (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  level text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (group_id, profile_id)
);

-- ── Sessions ──────────────────────────────────────────────────────────
create type session_status as enum ('draft', 'published');

create table sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  coach_id uuid not null references profiles(id),
  title text not null,
  type text not null,
  description text,
  warmup text,
  main_set text,
  cooldown text,
  duration_min int,
  distance_km numeric(5,2),
  vma_percent int,
  scheduled_at timestamptz not null,
  status session_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index sessions_club_id_idx on sessions(club_id);
create index sessions_scheduled_at_idx on sessions(scheduled_at);

create table session_assignments (
  session_id uuid not null references sessions(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  primary key (session_id, group_id)
);

-- ── Completions ───────────────────────────────────────────────────────
create type completion_status as enum ('done', 'skipped', 'free_session');

create table session_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  status completion_status not null,
  rpe int,
  note text,
  free_session_title text,
  free_session_distance_km numeric(5,2),
  free_session_duration_min int,
  completed_at timestamptz not null default now(),
  unique (session_id, profile_id)
);

create index session_completions_profile_id_idx on session_completions(profile_id);

-- ── Daily check-ins (bilan de forme) ─────────────────────────────────────
create table daily_checkins (
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  sleep int check (sleep between 1 and 5),
  fatigue int check (fatigue between 1 and 5),
  stress int check (stress between 1 and 5),
  soreness int check (soreness between 1 and 5),
  motivation int check (motivation between 1 and 5),
  primary key (profile_id, date)
);

-- ── Personal records ──────────────────────────────────────────────────
create table personal_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  discipline text not null,
  value text not null,
  date date not null,
  is_season_best boolean not null default false
);

-- ── Messaging (texte uniquement en v1) ───────────────────────────────────
create type conversation_kind as enum ('dm', 'group', 'announcement');

create table conversations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  kind conversation_kind not null,
  group_id uuid references groups(id) on delete cascade,
  title text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on messages(conversation_id, created_at);

-- ══════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════════

alter table clubs enable row level security;
alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table sessions enable row level security;
alter table session_assignments enable row level security;
alter table session_completions enable row level security;
alter table daily_checkins enable row level security;
alter table personal_records enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Helper: club + role of the current user, without recursive RLS lookups.
create or replace function my_club_id() returns uuid
language sql security definer stable as $$
  select club_id from profiles where id = auth.uid()
$$;

create or replace function my_role() returns user_role
language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_group_member(gid uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from group_members where group_id = gid and profile_id = auth.uid())
$$;

-- clubs: readable by members
create policy "club members can read their club" on clubs
  for select using (id = my_club_id());

-- profiles: readable within same club; each user updates their own row.
-- No direct insert policy — profile creation only happens via the
-- join_club_with_invite() SECURITY DEFINER RPC so a signing-up user can never
-- pick their own club_id or role.
create policy "read profiles in same club" on profiles
  for select using (club_id = my_club_id());
create policy "user updates own profile" on profiles
  for update using (id = auth.uid());

-- groups: readable by club members; writable by coaches of that club
create policy "read groups in same club" on groups
  for select using (club_id = my_club_id());
create policy "coach manages groups" on groups
  for all using (club_id = my_club_id() and my_role() = 'coach')
  with check (club_id = my_club_id() and my_role() = 'coach');

-- group_members: readable by club members; writable by coaches
create policy "read group members in same club" on group_members
  for select using (exists (select 1 from groups g where g.id = group_id and g.club_id = my_club_id()));
create policy "coach manages group members" on group_members
  for all using (my_role() = 'coach' and exists (select 1 from groups g where g.id = group_id and g.club_id = my_club_id()))
  with check (my_role() = 'coach' and exists (select 1 from groups g where g.id = group_id and g.club_id = my_club_id()));

-- sessions: published sessions readable by club members; coach manages own club's sessions
create policy "read published sessions in same club" on sessions
  for select using (club_id = my_club_id() and (status = 'published' or coach_id = auth.uid()));
create policy "coach manages sessions" on sessions
  for all using (club_id = my_club_id() and my_role() = 'coach')
  with check (club_id = my_club_id() and my_role() = 'coach');

-- session_assignments: readable if session visible; writable by coach
create policy "read assignments in same club" on session_assignments
  for select using (exists (select 1 from sessions s where s.id = session_id and s.club_id = my_club_id()));
create policy "coach manages assignments" on session_assignments
  for all using (my_role() = 'coach' and exists (select 1 from sessions s where s.id = session_id and s.club_id = my_club_id()))
  with check (my_role() = 'coach' and exists (select 1 from sessions s where s.id = session_id and s.club_id = my_club_id()));

-- session_completions: athlete manages their own; coach reads club's
create policy "athlete manages own completions" on session_completions
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy "coach reads club completions" on session_completions
  for select using (
    my_role() = 'coach' and exists (
      select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id()
    )
  );

-- daily_checkins: athlete manages own; coach reads club's
create policy "athlete manages own checkins" on daily_checkins
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy "coach reads club checkins" on daily_checkins
  for select using (
    my_role() = 'coach' and exists (
      select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id()
    )
  );

-- personal_records: athlete manages own; club members read
create policy "read personal records in same club" on personal_records
  for select using (exists (select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id()));
create policy "athlete manages own records" on personal_records
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- conversations: participants (or coaches for group/announcement conversations in their club)
create policy "read own conversations" on conversations
  for select using (
    exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.profile_id = auth.uid())
    or (kind = 'announcement' and club_id = my_club_id())
  );
create policy "coach creates conversations" on conversations
  for insert with check (club_id = my_club_id() and my_role() = 'coach');

-- conversation_participants: visible to other participants in the same conversation
create policy "read participants of own conversations" on conversation_participants
  for select using (
    exists (select 1 from conversation_participants cp2 where cp2.conversation_id = conversation_id and cp2.profile_id = auth.uid())
  );
create policy "coach adds participants" on conversation_participants
  for insert with check (
    exists (select 1 from conversations c where c.id = conversation_id and c.club_id = my_club_id() and my_role() = 'coach')
  );

-- messages: participants can read/write; announcements readable by whole club
create policy "read messages in own conversations" on messages
  for select using (
    exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.profile_id = auth.uid())
    or exists (select 1 from conversations c where c.id = conversation_id and c.kind = 'announcement' and c.club_id = my_club_id())
  );
create policy "participants send messages" on messages
  for insert with check (
    sender_id = auth.uid() and (
      exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.profile_id = auth.uid())
      or exists (select 1 from conversations c where c.id = conversation_id and c.kind = 'announcement' and c.club_id = my_club_id() and my_role() = 'coach')
    )
  );

alter table club_invites enable row level security;
-- No policies on club_invites at all: it's only ever touched through the
-- SECURITY DEFINER RPC below, never queried directly by clients.

-- ══════════════════════════════════════════════════════════════════════
-- Signup RPC — resolves an invite code into club_id + role and creates
-- the caller's profile row. Runs as the function owner (bypasses RLS),
-- which is the only way a profile row gets created.
-- ══════════════════════════════════════════════════════════════════════
create or replace function join_club_with_invite(invite_code text, display_name text)
returns void
language plpgsql security definer as $$
declare
  inv club_invites%rowtype;
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  select * into inv from club_invites where code = invite_code for update;
  if not found then
    raise exception 'Code invitation invalide';
  end if;
  if inv.uses >= inv.max_uses then
    raise exception 'Ce code d''invitation a déjà été utilisé';
  end if;

  insert into profiles (id, club_id, role, name, email)
  values (auth.uid(), inv.club_id, inv.role, display_name, (select email from auth.users where id = auth.uid()));

  update club_invites set uses = uses + 1 where code = invite_code;
end;
$$;

grant execute on function join_club_with_invite(text, text) to authenticated;
