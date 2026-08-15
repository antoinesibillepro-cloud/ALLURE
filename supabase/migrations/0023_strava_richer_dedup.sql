-- Richer Strava stats already present in the API's summary response (no extra
-- calls needed): average speed, elevation gain, heart rate.
alter table strava_activities add column if not exists average_speed_ms numeric;
alter table strava_activities add column if not exists total_elevation_gain_m numeric;
alter table strava_activities add column if not exists average_heartrate numeric;
alter table strava_activities add column if not exists max_heartrate numeric;

-- Links a completion to the Strava activity that (auto-)completed it, so a
-- synced run that matches a coach-planned session doesn't show up twice —
-- once as the planned session, once as a separate Strava entry.
alter table session_completions add column if not exists strava_activity_id uuid references strava_activities(id) on delete set null;
