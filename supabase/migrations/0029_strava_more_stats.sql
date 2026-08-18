-- More of what Strava's activity list already returns for free: cadence and
-- power for cyclists, energy expenditure, and Strava's own "relative effort"
-- score — useful training-load signals the coach currently can't see at all.
alter table strava_activities add column if not exists average_cadence numeric;
alter table strava_activities add column if not exists average_watts numeric;
alter table strava_activities add column if not exists kilojoules numeric;
alter table strava_activities add column if not exists suffer_score numeric;
