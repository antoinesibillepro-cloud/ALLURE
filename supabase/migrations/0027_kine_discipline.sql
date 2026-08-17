-- Physio ("kiné") sessions: coach can schedule one like any other discipline,
-- athlete can also log a free one — same treatment as musculation (no
-- distance, no %VMA).
alter table sessions drop constraint sessions_discipline_check;
alter table sessions add constraint sessions_discipline_check
  check (discipline in ('course', 'velo', 'natation', 'muscu', 'kine'));
