-- Allow the coach to add/edit/delete personal records for athletes in their own club
-- (e.g. entering PBs read off an athlete's FFA "Base Athlé" sheet by hand).
create policy "coach manages club athletes' records" on personal_records
  for all using (
    my_role() = 'coach' and exists (select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id())
  )
  with check (
    my_role() = 'coach' and exists (select 1 from profiles p where p.id = profile_id and p.club_id = my_club_id())
  );
