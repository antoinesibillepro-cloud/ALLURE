-- Chrono objectives (coach-set targets) can now also carry a target
-- distance and a target recovery per rep, mirroring the coach's
-- spreadsheet layout (reps x distance -> objectif + récup).
alter table session_target_splits add column if not exists distance_m numeric(7,1);
alter table session_target_splits add column if not exists recovery_seconds numeric(6,1);
