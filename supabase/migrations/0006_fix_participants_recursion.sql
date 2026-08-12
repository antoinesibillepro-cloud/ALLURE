-- The original "read participants of own conversations" policy queried
-- conversation_participants from within its own policy body, which Postgres
-- re-evaluates recursively (error 42P17: infinite recursion detected).
-- Fix: check membership via a SECURITY DEFINER helper, same pattern as
-- my_club_id()/my_role(), which bypasses RLS for its own lookup.

create or replace function am_participant(conv_id uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from conversation_participants where conversation_id = conv_id and profile_id = auth.uid())
$$;

drop policy "read participants of own conversations" on conversation_participants;
create policy "read participants of own conversations" on conversation_participants
  for select using (am_participant(conversation_id));

-- messages/conversations policies referenced conversation_participants directly
-- in a subquery too — that's fine (different table, no self-reference), but
-- switch them to the helper for consistency and one less query plan surprise.
drop policy "read own conversations" on conversations;
create policy "read own conversations" on conversations
  for select using (am_participant(id) or (kind = 'announcement' and club_id = my_club_id()));

drop policy "read messages in own conversations" on messages;
create policy "read messages in own conversations" on messages
  for select using (
    am_participant(conversation_id)
    or exists (select 1 from conversations c where c.id = conversation_id and c.kind = 'announcement' and c.club_id = my_club_id())
  );

drop policy "participants send messages" on messages;
create policy "participants send messages" on messages
  for insert with check (
    sender_id = auth.uid() and (
      am_participant(conversation_id)
      or exists (select 1 from conversations c where c.id = conversation_id and c.kind = 'announcement' and c.club_id = my_club_id() and my_role() = 'coach')
    )
  );
