interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: { id: number }
}

export async function exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  start_date: string
  average_speed?: number
  total_elevation_gain?: number
  average_heartrate?: number
  max_heartrate?: number
}

export async function fetchRecentActivities(accessToken: string, perPage = 30): Promise<StravaActivity[]> {
  const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export interface StravaLap {
  lap_index: number
  moving_time: number
  elapsed_time: number
  distance: number
}

/** Per-rep laps (manual lap presses or auto-laps) for an activity — the closest Strava gets to interval splits. */
export async function fetchActivityLaps(accessToken: string, activityId: number): Promise<StravaLap[]> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}/laps`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Strava laps fetch failed: ${res.status} ${await res.text()}`)
  return res.json()
}
