-- A Strava sync can auto-mark a coach-planned session as done from the raw
-- activity data, but the athlete never chose an RPE and never entered
-- interval splits — that data is real but unconfirmed. Flag it so the app
-- can require the athlete to open the session and confirm/complete it,
-- instead of silently treating a Strava GPS track as a finished review.
alter table session_completions add column if not exists needs_confirmation boolean not null default false;
