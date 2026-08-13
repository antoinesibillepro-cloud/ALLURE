-- Let a user stamp their own last_read_at (drives the real unread-message badge).
-- Only their own participant row, and they cannot reassign it to someone else.
create policy "users mark their own conversations read" on conversation_participants
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
