import { supabase } from '../supabase'

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function fetchStravaStatus(): Promise<{ connected: boolean; connectedAt: string | null }> {
  const token = await authHeader()
  if (!token) return { connected: false, connectedAt: null }
  const res = await fetch('/api/strava/status', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return { connected: false, connectedAt: null }
  return res.json()
}

export async function connectStrava() {
  const token = await authHeader()
  if (!token) return
  window.location.href = `/api/strava/connect?token=${encodeURIComponent(token)}`
}

export async function syncStrava(): Promise<{ synced: number }> {
  const token = await authHeader()
  if (!token) throw new Error('Non authentifié')
  const res = await fetch('/api/strava/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error((await res.json()).error ?? 'Échec de la synchronisation')
  return res.json()
}

export interface StravaActivity {
  id: string
  name: string
  type: string
  distance_m: number
  moving_time_s: number
  start_date: string
  average_speed_ms: number | null
  total_elevation_gain_m: number | null
  average_heartrate: number | null
  max_heartrate: number | null
}

export async function fetchStravaActivities(profileId: string, limit = 10): Promise<StravaActivity[]> {
  const { data, error } = await supabase
    .from('strava_activities')
    .select('id, name, type, distance_m, moving_time_s, start_date, average_speed_ms, total_elevation_gain_m, average_heartrate, max_heartrate')
    .eq('profile_id', profileId)
    .order('start_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/** Strava activity ids already linked to a session completion — used to avoid showing them twice on the calendar. */
export async function fetchLinkedStravaActivityIds(profileId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('session_completions')
    .select('strava_activity_id')
    .eq('profile_id', profileId)
    .not('strava_activity_id', 'is', null)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.strava_activity_id as string))
}
