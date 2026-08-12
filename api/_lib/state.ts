import { createHmac, timingSafeEqual } from 'node:crypto'

/** Signs a Strava OAuth `state` param so the callback can trust which profile initiated it. */
export function signState(profileId: string): string {
  const sig = createHmac('sha256', process.env.STRAVA_STATE_SECRET!).update(profileId).digest('hex')
  return `${profileId}.${sig}`
}

export function verifyState(state: string): string | null {
  const [profileId, sig] = state.split('.')
  if (!profileId || !sig) return null
  const expected = createHmac('sha256', process.env.STRAVA_STATE_SECRET!).update(profileId).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return profileId
}
