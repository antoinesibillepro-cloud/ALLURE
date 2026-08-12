-- daily_checkins.sleep was constrained to 1-5 like the other fields, but the
-- UI has always asked for something more like "hours of sleep" — and the
-- other fields (fatigue/stress/soreness/motivation) are meant to be a 0-10
-- scale, not 1-5. The mismatch made HomeScreen's default form state
-- (sleep: 6) violate the old constraint outright.

alter table daily_checkins drop constraint if exists daily_checkins_sleep_check;
alter table daily_checkins alter column sleep type numeric(3,1);
alter table daily_checkins add constraint daily_checkins_sleep_check check (sleep between 0 and 14);

alter table daily_checkins drop constraint if exists daily_checkins_fatigue_check;
alter table daily_checkins add constraint daily_checkins_fatigue_check check (fatigue between 0 and 10);

alter table daily_checkins drop constraint if exists daily_checkins_stress_check;
alter table daily_checkins add constraint daily_checkins_stress_check check (stress between 0 and 10);

alter table daily_checkins drop constraint if exists daily_checkins_soreness_check;
alter table daily_checkins add constraint daily_checkins_soreness_check check (soreness between 0 and 10);

alter table daily_checkins drop constraint if exists daily_checkins_motivation_check;
alter table daily_checkins add constraint daily_checkins_motivation_check check (motivation between 0 and 10);
