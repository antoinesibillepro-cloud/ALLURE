-- Sub-groups: a group can now have a parent, so a coach can split
-- "Groupe principal" into interchangeable "Groupe 1 / 2 / 3" and move
-- athletes between them freely (reuses existing group_members + the
-- existing "coach manages groups" / "coach manages group members" RLS,
-- which already covers all columns/rows in the coach's own club).
alter table groups add column if not exists parent_group_id uuid references groups(id) on delete cascade;
create index if not exists groups_parent_group_id_idx on groups(parent_group_id);

-- Session themes become an editable, club-scoped list instead of a
-- hardcoded array in the frontend.
create table session_types (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (club_id, name)
);
alter table session_types enable row level security;
create policy "read session types in same club" on session_types
  for select using (club_id = my_club_id());
create policy "coach manages session types" on session_types
  for all using (club_id = my_club_id() and my_role() = 'coach')
  with check (club_id = my_club_id() and my_role() = 'coach');

-- Morning/afternoon slot on a session.
alter table sessions add column if not exists time_slot text check (time_slot in ('matin', 'apres-midi'));

-- A session can be split into several work blocks — one per group/subgroup
-- (or a rest block with no group) — each with its own content and target
-- pace, matching the coach's spreadsheet layout ("Groupe 1" / "Groupe 2"
-- with different content in the same session).
create table session_work_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  label text,
  content text,
  target_pace_sec_per_km numeric(6,1),
  is_rest boolean not null default false,
  created_at timestamptz not null default now()
);
create index session_work_blocks_session_id_idx on session_work_blocks(session_id);

create table session_target_splits (
  id uuid primary key default gen_random_uuid(),
  work_block_id uuid not null references session_work_blocks(id) on delete cascade,
  rep_number int not null,
  target_time_seconds numeric(6,2),
  created_at timestamptz not null default now(),
  unique (work_block_id, rep_number)
);

alter table session_work_blocks enable row level security;
alter table session_target_splits enable row level security;

create policy "read work blocks in same club" on session_work_blocks
  for select using (exists (select 1 from sessions s where s.id = session_id and s.club_id = my_club_id()));
create policy "coach manages work blocks" on session_work_blocks
  for all using (my_role() = 'coach' and exists (select 1 from sessions s where s.id = session_id and s.club_id = my_club_id()))
  with check (my_role() = 'coach' and exists (select 1 from sessions s where s.id = session_id and s.club_id = my_club_id()));

create policy "read target splits in same club" on session_target_splits
  for select using (
    exists (select 1 from session_work_blocks b join sessions s on s.id = b.session_id where b.id = work_block_id and s.club_id = my_club_id())
  );
create policy "coach manages target splits" on session_target_splits
  for all using (
    my_role() = 'coach' and exists (select 1 from session_work_blocks b join sessions s on s.id = b.session_id where b.id = work_block_id and s.club_id = my_club_id())
  )
  with check (
    my_role() = 'coach' and exists (select 1 from session_work_blocks b join sessions s on s.id = b.session_id where b.id = work_block_id and s.club_id = my_club_id())
  );
