-- The "séance libre" logging sheet already lets the athlete pick a sport
-- (course/vélo/natation/muscu/kiné/autre) but the column to store it never
-- existed, so the choice was silently discarded on save.
alter table session_completions add column if not exists free_session_discipline text
  check (free_session_discipline in ('course', 'velo', 'natation', 'muscu', 'kine', 'autre'));
