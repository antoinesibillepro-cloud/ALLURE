-- Lets the coach plan vélo/natation/musculation sessions too, not just course
-- à pied. distance_km/vma_percent stay nullable (already were) since they
-- don't apply to every discipline (e.g. muscu has neither).
alter table sessions add column if not exists discipline text not null default 'course'
  check (discipline in ('course', 'velo', 'natation', 'muscu'));
