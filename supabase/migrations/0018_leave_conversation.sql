create policy "users leave their own conversations" on conversation_participants
  for delete using (profile_id = auth.uid());
