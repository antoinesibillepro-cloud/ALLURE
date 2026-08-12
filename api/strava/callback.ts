import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { verifyState } from '../_lib/state.js'
import { exchangeCodeForToken } from '../_lib/strava.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const siteUrl = `https://${req.headers.host}`
  const { code, state, error } = req.query as Record<string, string | undefined>

  if (error || !code || !state) {
    return res.redirect(302, `${siteUrl}/?strava=error`)
  }

  const profileId = verifyState(state)
  if (!profileId) {
    return res.redirect(302, `${siteUrl}/?strava=error`)
  }

  try {
    const token = await exchangeCodeForToken(code)
    const admin = supabaseAdmin()
    const { error: dbError } = await admin.from('strava_accounts').upsert({
      profile_id: profileId,
      strava_athlete_id: token.athlete?.id ?? 0,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
      scope: (req.query.scope as string) ?? '',
      connected_at: new Date().toISOString(),
    })
    if (dbError) throw dbError
    return res.redirect(302, `${siteUrl}/?strava=connected`)
  } catch (err) {
    console.error('Strava callback error', err)
    return res.redirect(302, `${siteUrl}/?strava=error`)
  }
}
