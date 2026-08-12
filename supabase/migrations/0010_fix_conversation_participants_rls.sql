-- "coach adds participants" checked conversation ownership via a raw
-- `exists (select 1 from conversations c where c.id = conversation_id ...)`
-- subquery, which is itself subject to conversations' own RLS SELECT policy
-- ("read own conversations": participant OR announcement). A freshly
-- created dm/group conversation has zero participants yet, so that lookup
-- always found 0 rows and silently failed the check — a chicken-and-egg
-- bug that made it impossible to ever add participants to a new dm/group
-- conversation. Fix: use a SECURITY DEFINER helper that bypasses RLS on
-- conversations, mirroring the my_club_id()/my_role() pattern.

create or replace function conversation_in_my_club(conv_id uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from conversations c where c.id = conv_id and c.club_id = my_club_id())
$$;

drop policy "coach adds participants" on conversation_participants;
create policy "coach adds participants" on conversation_participants
  for insert with check (my_role() = 'coach' and conversation_in_my_club(conversation_id));
