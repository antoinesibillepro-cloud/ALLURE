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
}

export async function fetchStravaActivities(profileId: string, limit = 10): Promise<StravaActivity[]> {
  const { data, error } = await supabase
    .from('strava_activities')
    .select('id, name, type, distance_m, moving_time_s, start_date')
    .eq('profile_id', profileId)
    .order('start_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
