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
