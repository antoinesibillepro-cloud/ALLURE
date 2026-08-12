import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { refreshStravaToken, fetchRecentActivities } from '../_lib/strava.js'

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
    }))
    if (rows.length > 0) {
      const { error: upsertErr } = await admin.from('strava_activities').upsert(rows, { onConflict: 'strava_id' })
      if (upsertErr) throw upsertErr
    }

    return res.status(200).json({ synced: rows.length })
  } catch (err) {
    console.error('Strava sync error', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Sync failed' })
  }
}
