-- Coach club admin: manage roster + invite codes.
-- club_invites had RLS enabled with zero policies (only reachable via the
-- join_club_with_invite RPC); coaches now need direct read/write access
-- scoped to their own club to generate and display invite codes.

create policy "coach reads club invites" on club_invites
  for select using (club_id = my_club_id() and my_role() = 'coach');
create policy "coach creates club invites" on club_invites
  for insert with check (club_id = my_club_id() and my_role() = 'coach');
create policy "coach updates club invites" on club_invites
  for update using (club_id = my_club_id() and my_role() = 'coach');

-- profiles: coaches can update (role changes) and remove members of their
-- own club. Removal deletes the profile row only — the auth.users row is
-- untouched, so the person keeps their login but loses club access until
-- re-invited.
create policy "coach updates profiles in same club" on profiles
  for update using (club_id = my_club_id() and my_role() = 'coach');
create policy "coach removes profiles in same club" on profiles
  for delete using (club_id = my_club_id() and my_role() = 'coach' and id <> auth.uid());

-- club: coach can update club name.
create policy "coach updates own club" on clubs
  for update using (id = my_club_id() and my_role() = 'coach');
