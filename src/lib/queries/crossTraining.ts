import { supabase } from '../supabase'

export type Discipline = 'velo' | 'natation' | 'musculation' | 'gainage'

export interface CrossTrainingLog {
  id: string
  discipline: Discipline
  date: string
  duration_min: number
  distance_km: number | null
  rpe: number | null
  notes: string | null
}

export async function fetchCrossTrainingLogs(profileId: string, discipline: Discipline, limit = 10): Promise<CrossTrainingLog[]> {
  const { data, error } = await supabase
    .from('cross_training_logs')
    .select('id, discipline, date, duration_min, distance_km, rpe, notes')
    .eq('profile_id', profileId)
    .eq('discipline', discipline)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function createCrossTrainingLog(profileId: string, input: Omit<CrossTrainingLog, 'id'>) {
  const { error } = await supabase.from('cross_training_logs').insert({ profile_id: profileId, ...input })
  if (error) throw error
}

export async function deleteCrossTrainingLog(id: string) {
  const { error } = await supabase.from('cross_training_logs').delete().eq('id', id)
  if (error) throw error
}

export interface DisciplineBreakdown {
  discipline: string
  sessions: number
  minutes: number
}

/** Running (from session_completions) + cross-training, over [from, to). */
export async function fetchDisciplineBreakdown(profileId: string, from: string, to: string): Promise<DisciplineBreakdown[]> {
  const { data: completions } = await supabase
    .from('session_completions')
    .select('status, session:sessions(duration_min)')
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', from)
    .lt('completed_at', to)
  const runningSessions = completions?.length ?? 0
  const runningMinutes = (completions ?? []).reduce((sum, c: unknown) => {
    const row = c as { session: { duration_min: number | null } | null }
    return sum + (row.session?.duration_min ?? 0)
  }, 0)

  const { data: cross } = await supabase
    .from('cross_training_logs')
    .select('discipline, duration_min')
    .eq('profile_id', profileId)
    .gte('date', from.slice(0, 10))
    .lt('date', to.slice(0, 10))

  const byDiscipline = new Map<string, DisciplineBreakdown>()
  byDiscipline.set('Course à pied', { discipline: 'Course à pied', sessions: runningSessions, minutes: runningMinutes })
  const labels: Record<Discipline, string> = { velo: 'Vélo', natation: 'Natation', musculation: 'Musculation', gainage: 'Gainage' }
  for (const c of cross ?? []) {
    const label = labels[c.discipline as Discipline]
    const prev = byDiscipline.get(label) ?? { discipline: label, sessions: 0, minutes: 0 }
    byDiscipline.set(label, { discipline: label, sessions: prev.sessions + 1, minutes: prev.minutes + c.duration_min })
  }
  return [...byDiscipline.values()].filter((d) => d.sessions > 0)
}

/** RPE × durée for training-load charts, over the last `weeks` weeks. */
export async function fetchWeeklyLoad(profileId: string, weeks = 8): Promise<{ label: string; load: number }[]> {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const thisWeekStart = new Date(now); thisWeekStart.setHours(0, 0, 0, 0); thisWeekStart.setDate(thisWeekStart.getDate() - day)
  const earliest = new Date(thisWeekStart.getTime() - weeks * 7 * 86400000)

  const { data: completions } = await supabase
    .from('session_completions')
    .select('completed_at, rpe, session:sessions(duration_min)')
    .eq('profile_id', profileId)
    .gte('completed_at', earliest.toISOString())
  const { data: cross } = await supabase
    .from('cross_training_logs')
    .select('date, rpe, duration_min')
    .eq('profile_id', profileId)
    .gte('date', earliest.toISOString().slice(0, 10))

  const results: { label: string; load: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * 7 * 86400000)
    const end = new Date(start.getTime() + 7 * 86400000)
    let load = 0
    for (const c of (completions ?? []) as unknown as Array<{ completed_at: string; rpe: number | null; session: { duration_min: number | null } | null }>) {
      const t = new Date(c.completed_at).getTime()
      if (t >= start.getTime() && t < end.getTime()) load += (c.rpe ?? 0) * (c.session?.duration_min ?? 0)
    }
    for (const c of cross ?? []) {
      const t = new Date(c.date).getTime()
      if (t >= start.getTime() && t < end.getTime()) load += (c.rpe ?? 0) * c.duration_min
    }
    results.push({ label: `S${52 - Math.floor((Date.now() - start.getTime()) / (7 * 86400000))}`, load })
  }
  return results
}
