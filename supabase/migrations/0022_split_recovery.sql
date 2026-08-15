-- Recovery time between reps, alongside the existing rep time (session_splits.time_seconds).
alter table session_splits add column if not exists recovery_seconds numeric(6,2);
