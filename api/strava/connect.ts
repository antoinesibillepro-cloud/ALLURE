import type { VercelRequest, VercelResponse } from '@vercel/node'
import { profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { signState } from '../_lib/state.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.query.token as string | undefined
  const profileId = await profileIdFromAuthHeader(token ? `Bearer ${token}` : undefined)
  if (!profileId) return res.status(401).send('Unauthorized')

  const siteUrl = `https://${req.headers.host}`
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${siteUrl}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: signState(profileId),
  })
  return res.redirect(302, `https://www.strava.com/oauth/authorize?${params.toString()}`)
}
