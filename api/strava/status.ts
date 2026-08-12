import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const profileId = await profileIdFromAuthHeader(req.headers.authorization)
  if (!profileId) return res.status(401).json({ error: 'Unauthorized' })

  const { data, error } = await supabaseAdmin()
    .from('strava_accounts')
    .select('strava_athlete_id, connected_at')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ connected: !!data, connectedAt: data?.connected_at ?? null })
}
