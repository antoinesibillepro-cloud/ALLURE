import { supabase } from '../supabase'

export interface WeekStats {
  kmDone: number
  kmPlanned: number
  sessionsDone: number
  sessionsPlanned: number
}

/** Real vs planned km/sessions for the athlete over [from, to). */
export async function fetchAthleteWeekStats(profileId: string, from: string, to: string): Promise<WeekStats> {
  const { data: memberships } = await supabase.from('group_members').select('group_id').eq('profile_id', profileId)
  const groupIds = (memberships ?? []).map((m) => m.group_id)

  let planned: { id: string; distance_km: number | null }[] = []
  if (groupIds.length > 0) {
    const { data: assignments } = await supabase.from('session_assignments').select('session_id').in('group_id', groupIds)
    const sessionIds = [...new Set((assignments ?? []).map((a) => a.session_id))]
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, distance_km')
        .in('id', sessionIds)
        .eq('status', 'published')
        .gte('scheduled_at', from)
        .lt('scheduled_at', to)
      planned = sessions ?? []
    }
  }

  const { data: completions } = await supabase
    .from('session_completions')
    .select('status, free_session_distance_km, session_id, completed_at')
    .eq('profile_id', profileId)
    .gte('completed_at', from)
    .lt('completed_at', to)

  const done = (completions ?? []).filter((c) => c.status === 'done' || c.status === 'free_session')
  const plannedIds = new Set(planned.map((p) => p.id))
  const kmFromPlanned = (completions ?? [])
    .filter((c) => c.status === 'done' && c.session_id && plannedIds.has(c.session_id))
    .reduce((sum, c) => sum + (planned.find((p) => p.id === c.session_id)?.distance_km ?? 0), 0)
  const kmFromFree = (completions ?? [])
    .filter((c) => c.status === 'free_session')
    .reduce((sum, c) => sum + (c.free_session_distance_km ?? 0), 0)

  return {
    kmDone: kmFromPlanned + kmFromFree,
    kmPlanned: planned.reduce((sum, p) => sum + (p.distance_km ?? 0), 0),
    sessionsDone: done.length,
    sessionsPlanned: planned.length,
  }
}

export interface WellnessAverages {
  count: number
  sleep: number; fatigue: number; stress: number; soreness: number; motivation: number
}

/** Averages daily_checkins over the last `days` days. */
export async function fetchWellnessAverages(profileId: string, days = 84): Promise<WellnessAverages> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('daily_checkins')
    .select('sleep, fatigue, stress, soreness, motivation')
    .eq('profile_id', profileId)
    .gte('date', since)
  const rows = data ?? []
  const avg = (key: 'sleep' | 'fatigue' | 'stress' | 'soreness' | 'motivation') =>
    rows.length ? rows.reduce((s, r) => s + (r[key] ?? 0), 0) / rows.length : 0
  return {
    count: rows.length,
    sleep: avg('sleep'), fatigue: avg('fatigue'), stress: avg('stress'), soreness: avg('soreness'), motivation: avg('motivation'),
  }
}

/** For each of the last 8 weeks: did the athlete complete at least one session? */
export async function fetchWeeklyStreak(profileId: string): Promise<boolean[]> {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const thisWeekStart = new Date(now); thisWeekStart.setHours(0, 0, 0, 0); thisWeekStart.setDate(thisWeekStart.getDate() - day)
  const earliestStart = new Date(thisWeekStart.getTime() - 7 * 7 * 86400000)

  const { data } = await supabase
    .from('session_completions')
    .select('completed_at')
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', earliestStart.toISOString())

  const weeks: boolean[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * 7 * 86400000)
    const end = new Date(start.getTime() + 7 * 86400000)
    const has = (data ?? []).some((c) => {
      const t = new Date(c.completed_at).getTime()
      return t >= start.getTime() && t < end.getTime()
    })
    weeks.push(has)
  }
  return weeks
}

export interface LastActivity { title: string; date: string; distanceKm: number | null }

export async function fetchLastActivity(profileId: string): Promise<LastActivity | null> {
  const { data } = await supabase
    .from('session_completions')
    .select('completed_at, free_session_title, free_session_distance_km, status, session:sessions(title, distance_km)')
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const row = data as unknown as { completed_at: string; free_session_title: string | null; free_session_distance_km: number | null; status: string; session: { title: string; distance_km: number | null } | null }
  return {
    title: row.status === 'free_session' ? (row.free_session_title ?? 'Séance libre') : (row.session?.title ?? ''),
    date: row.completed_at,
    distanceKm: row.status === 'free_session' ? row.free_session_distance_km : row.session?.distance_km ?? null,
  }
}

/** Average pace (min/km) over [from, to) from done + free sessions with both distance and duration. */
export async function fetchAveragePace(profileId: string, from: string, to: string): Promise<number | null> {
  const { data } = await supabase
    .from('session_completions')
    .select('status, free_session_distance_km, free_session_duration_min, session:sessions(distance_km, duration_min)')
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', from)
    .lt('completed_at', to)
  let km = 0, min = 0
  for (const c of (data ?? []) as unknown as { status: string; free_session_distance_km: number | null; free_session_duration_min: number | null; session: { distance_km: number | null; duration_min: number | null } | null }[]) {
    const d = c.status === 'free_session' ? c.free_session_distance_km : c.session?.distance_km
    const m = c.status === 'free_session' ? c.free_session_duration_min : c.session?.duration_min
    if (d && m) { km += d; min += m }
  }
  return km > 0 ? min / km : null
}

/** All-time cumulative km for the athlete (done sessions + free sessions). */
export async function fetchAthleteTotalKm(profileId: string): Promise<number> {
  const { data: completions } = await supabase
    .from('session_completions')
    .select('status, free_session_distance_km, session:sessions(distance_km)')
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
  return (completions ?? []).reduce((sum, c: unknown) => {
    const row = c as { status: string; free_session_distance_km: number | null; session: { distance_km: number | null } | null }
    return sum + (row.status === 'free_session' ? (row.free_session_distance_km ?? 0) : (row.session?.distance_km ?? 0))
  }, 0)
}
