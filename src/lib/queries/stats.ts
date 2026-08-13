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
    .select('status, free_session_distance_km, free_session_duration_min, actual_distance_km, actual_duration_min, session:sessions(distance_km, duration_min)')
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', from)
    .lt('completed_at', to)
  let km = 0, min = 0
  for (const c of (data ?? []) as unknown as {
    status: string; free_session_distance_km: number | null; free_session_duration_min: number | null
    actual_distance_km: number | null; actual_duration_min: number | null
    session: { distance_km: number | null; duration_min: number | null } | null
  }[]) {
    const d = c.status === 'free_session' ? c.free_session_distance_km : (c.actual_distance_km ?? c.session?.distance_km)
    const m = c.status === 'free_session' ? c.free_session_duration_min : (c.actual_duration_min ?? c.session?.duration_min)
    if (d && m) { km += d; min += m }
  }
  return km > 0 ? min / km : null
}

/** Average pace (min/km) per week, over the last `weeks` weeks. */
export async function fetchWeeklyAveragePace(profileId: string, weeks = 8): Promise<{ label: string; value: number }[]> {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const thisWeekStart = new Date(now); thisWeekStart.setHours(0, 0, 0, 0); thisWeekStart.setDate(thisWeekStart.getDate() - day)
  const earliest = new Date(thisWeekStart.getTime() - weeks * 7 * 86400000)

  const { data } = await supabase
    .from('session_completions')
    .select('completed_at, status, free_session_distance_km, free_session_duration_min, actual_distance_km, actual_duration_min, session:sessions(distance_km, duration_min)')
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', earliest.toISOString())

  const rows = (data ?? []) as unknown as {
    completed_at: string; status: string
    free_session_distance_km: number | null; free_session_duration_min: number | null
    actual_distance_km: number | null; actual_duration_min: number | null
    session: { distance_km: number | null; duration_min: number | null } | null
  }[]

  const results: { label: string; value: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * 7 * 86400000)
    const end = new Date(start.getTime() + 7 * 86400000)
    let km = 0, min = 0
    for (const c of rows) {
      const t = new Date(c.completed_at).getTime()
      if (t < start.getTime() || t >= end.getTime()) continue
      const d = c.status === 'free_session' ? c.free_session_distance_km : (c.actual_distance_km ?? c.session?.distance_km)
      const m = c.status === 'free_session' ? c.free_session_duration_min : (c.actual_duration_min ?? c.session?.duration_min)
      if (d && m) { km += d; min += m }
    }
    results.push({ label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), value: km > 0 ? +(min / km).toFixed(2) : 0 })
  }
  return results
}

export interface WellnessScore {
  pct: number
  date: string
}

/** Latest daily_checkin per club athlete, converted to a single 0-100% physical form score. */
export async function fetchLatestWellnessScores(clubId: string): Promise<Record<string, WellnessScore>> {
  const { data: athletes } = await supabase.from('profiles').select('id').eq('club_id', clubId).eq('role', 'athlete')
  const ids = (athletes ?? []).map((a) => a.id)
  if (ids.length === 0) return {}

  const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('daily_checkins')
    .select('profile_id, date, sleep, fatigue, stress, soreness, motivation')
    .in('profile_id', ids)
    .gte('date', since)
    .order('date', { ascending: false })

  const result: Record<string, WellnessScore> = {}
  for (const row of data ?? []) {
    if (result[row.profile_id]) continue // already have the latest (rows ordered desc)
    const sleepScore = Math.min(1, (row.sleep ?? 0) / 8)
    const motivationScore = (row.motivation ?? 0) / 10
    const fatigueScore = 1 - (row.fatigue ?? 0) / 10
    const stressScore = 1 - (row.stress ?? 0) / 10
    const sorenessScore = 1 - (row.soreness ?? 0) / 10
    const pct = Math.round(((sleepScore + motivationScore + fatigueScore + stressScore + sorenessScore) / 5) * 100)
    result[row.profile_id] = { pct, date: row.date }
  }
  return result
}

/** Count of daily_checkins in the last `days` days whose composite form score is >= `threshold`%. */
export async function fetchGoodRecoveryDaysCount(profileId: string, days = 30, threshold = 70): Promise<number> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('daily_checkins')
    .select('sleep, fatigue, stress, soreness, motivation')
    .eq('profile_id', profileId)
    .gte('date', since)
  return (data ?? []).filter((row) => {
    const sleepScore = Math.min(1, (row.sleep ?? 0) / 8)
    const motivationScore = (row.motivation ?? 0) / 10
    const fatigueScore = 1 - (row.fatigue ?? 0) / 10
    const stressScore = 1 - (row.stress ?? 0) / 10
    const sorenessScore = 1 - (row.soreness ?? 0) / 10
    const pct = ((sleepScore + motivationScore + fatigueScore + stressScore + sorenessScore) / 5) * 100
    return pct >= threshold
  }).length
}

export interface TypeBreakdown { type: string; count: number; color: string }
const TYPE_COLORS = ['#F2C400', '#5B91D8', '#E4574A', '#7B6FD6', '#5EBA65', '#F2924D', '#4FC3D9']
const FREE_SESSION_COLOR = '#9CA3AF'

/** Breakdown of completed sessions by training type (VMA, endurance, côtes...) over [from, to), colored per session_types.color. */
export async function fetchSessionTypeBreakdown(profileId: string, clubId: string, from: string, to: string): Promise<TypeBreakdown[]> {
  const [{ data }, { data: types }] = await Promise.all([
    supabase
      .from('session_completions')
      .select('status, free_session_title, session:sessions(type)')
      .eq('profile_id', profileId)
      .in('status', ['done', 'free_session'])
      .gte('completed_at', from)
      .lt('completed_at', to),
    supabase.from('session_types').select('name, color').eq('club_id', clubId),
  ])
  const colorByName = new Map((types ?? []).map((t) => [t.name, t.color]))
  const counts = new Map<string, number>()
  for (const c of (data ?? []) as unknown as { status: string; free_session_title: string | null; session: { type: string } | null }[]) {
    const type = c.status === 'free_session' ? 'Séance libre' : (c.session?.type ?? 'Autre')
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count, color: type === 'Séance libre' ? FREE_SESSION_COLOR : (colorByName.get(type) ?? '#999') }))
    .sort((a, b) => b.count - a.count)
}
export { TYPE_COLORS }

/** Running km per week, over the last `weeks` weeks. */
export async function fetchWeeklyKm(profileId: string, weeks = 4): Promise<{ label: string; value: number }[]> {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const thisWeekStart = new Date(now); thisWeekStart.setHours(0, 0, 0, 0); thisWeekStart.setDate(thisWeekStart.getDate() - day)
  const earliest = new Date(thisWeekStart.getTime() - weeks * 7 * 86400000)

  const { data } = await supabase
    .from('session_completions')
    .select('completed_at, status, free_session_distance_km, actual_distance_km, session:sessions(distance_km)')
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', earliest.toISOString())

  const rows = (data ?? []) as unknown as {
    completed_at: string; status: string; free_session_distance_km: number | null
    actual_distance_km: number | null; session: { distance_km: number | null } | null
  }[]

  const results: { label: string; value: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * 7 * 86400000)
    const end = new Date(start.getTime() + 7 * 86400000)
    let km = 0
    for (const r of rows) {
      const t = new Date(r.completed_at).getTime()
      if (t < start.getTime() || t >= end.getTime()) continue
      km += r.status === 'free_session' ? (r.free_session_distance_km ?? 0) : (r.actual_distance_km ?? r.session?.distance_km ?? 0)
    }
    results.push({ label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), value: +km.toFixed(1) })
  }
  return results
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
