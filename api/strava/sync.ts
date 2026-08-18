import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { refreshStravaToken, fetchRecentActivities, fetchActivityLaps } from '../_lib/strava.js'

const RUN_TYPES = new Set(['Run', 'VirtualRun', 'TrailRun'])

/**
 * A synced run means the athlete's coach-planned session for that day was, in
 * principle, actually run — so auto-mark it done with the real Strava numbers
 * instead of leaving it duplicated as a separate unlinked calendar entry.
 * Only touches published sessions that don't already have a 'done' completion.
 */
async function autoCompleteMatchingSessions(
  admin: ReturnType<typeof supabaseAdmin>,
  profileId: string,
  activities: { id: string; strava_id: number; type: string; distance_m: number; moving_time_s: number; start_date: string }[],
  accessToken: string,
) {
  const runs = activities.filter((a) => RUN_TYPES.has(a.type))
  if (!runs.length) return

  const { data: memberships } = await admin.from('group_members').select('group_id').eq('profile_id', profileId)
  const groupIds = (memberships ?? []).map((m) => m.group_id)
  if (!groupIds.length) return

  const { data: assignments } = await admin.from('session_assignments').select('session_id').in('group_id', groupIds)
  const sessionIds = [...new Set((assignments ?? []).map((a) => a.session_id))]
  if (!sessionIds.length) return

  const { data: sessions } = await admin
    .from('sessions')
    .select('id, scheduled_at')
    .in('id', sessionIds)
    .eq('status', 'published')
  if (!sessions?.length) return

  const { data: existing } = await admin
    .from('session_completions')
    .select('session_id')
    .eq('profile_id', profileId)
    .eq('status', 'done')
    .in('session_id', sessions.map((s) => s.id))
  const alreadyDone = new Set((existing ?? []).map((c) => c.session_id))

  const sessionsByDay = new Map<string, string>() // date -> session_id, first published match wins
  for (const s of sessions) {
    if (alreadyDone.has(s.id)) continue
    const day = s.scheduled_at.slice(0, 10)
    if (!sessionsByDay.has(day)) sessionsByDay.set(day, s.id)
  }
  if (!sessionsByDay.size) return

  for (const run of runs) {
    const day = run.start_date.slice(0, 10)
    const sessionId = sessionsByDay.get(day)
    if (!sessionId) continue
    sessionsByDay.delete(day) // one activity per session
    const { data: completion, error: completionErr } = await admin.from('session_completions').upsert({
      session_id: sessionId,
      profile_id: profileId,
      status: 'done',
      actual_distance_km: Math.round((run.distance_m / 1000) * 100) / 100,
      actual_duration_min: Math.round(run.moving_time_s / 60),
      completed_at: run.start_date,
      strava_activity_id: run.id,
    }, { onConflict: 'session_id,profile_id' }).select('id').single()
    if (completionErr || !completion) continue

    // Interval workouts on a watch produce several laps — import them as splits so the
    // coach sees real rep-by-rep chronos instead of just the aggregate distance/duration.
    try {
      const laps = await fetchActivityLaps(accessToken, run.strava_id)
      if (laps.length > 1) {
        await admin.from('session_splits').upsert(
          laps.map((lap) => ({
            session_completion_id: completion.id,
            rep_number: lap.lap_index,
            time_seconds: lap.moving_time,
            recovery_seconds: lap.elapsed_time > lap.moving_time ? lap.elapsed_time - lap.moving_time : null,
          })),
          { onConflict: 'session_completion_id,rep_number' },
        )
      }
    } catch {
      // Best-effort: a lap-fetch failure shouldn't block marking the session done.
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const profileId = await profileIdFromAuthHeader(req.headers.authorization)
  if (!profileId) return res.status(401).json({ error: 'Unauthorized' })

  const admin = supabaseAdmin()
  const { data: account, error: accErr } = await admin
    .from('strava_accounts')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (accErr) return res.status(500).json({ error: accErr.message })
  if (!account) return res.status(404).json({ error: 'Strava non connecté' })

  try {
    let accessToken = account.access_token
    if (new Date(account.expires_at).getTime() < Date.now() + 60_000) {
      const refreshed = await refreshStravaToken(account.refresh_token)
      accessToken = refreshed.access_token
      await admin.from('strava_accounts').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
      }).eq('profile_id', profileId)
    }

    const activities = await fetchRecentActivities(accessToken)
    const rows = activities.map((a) => ({
      profile_id: profileId,
      strava_id: a.id,
      name: a.name,
      type: a.type,
      distance_m: a.distance,
      moving_time_s: a.moving_time,
      start_date: a.start_date,
      average_speed_ms: a.average_speed ?? null,
      total_elevation_gain_m: a.total_elevation_gain ?? null,
      average_heartrate: a.average_heartrate ?? null,
      max_heartrate: a.max_heartrate ?? null,
      average_cadence: a.average_cadence ?? null,
      average_watts: a.average_watts ?? null,
      kilojoules: a.kilojoules ?? null,
      suffer_score: a.suffer_score ?? null,
    }))
    if (rows.length > 0) {
      const { data: upserted, error: upsertErr } = await admin
        .from('strava_activities')
        .upsert(rows, { onConflict: 'strava_id' })
        .select('id, strava_id, type, distance_m, moving_time_s, start_date')
      if (upsertErr) throw upsertErr
      await autoCompleteMatchingSessions(admin, profileId, upserted ?? [], accessToken)
    }

    return res.status(200).json({ synced: rows.length })
  } catch (err) {
    console.error('Strava sync error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Sync failed' })
  }
}
