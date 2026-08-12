import { supabase } from '../supabase'

export interface SessionInput {
  title: string
  type: string
  description: string
  duration_min: number
  distance_km: number
  vma_percent: number
  scheduled_at: string // ISO date
  group_ids: string[]
  status: 'draft' | 'published'
}

export async function createSession(clubId: string, coachId: string, input: SessionInput) {
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      club_id: clubId,
      coach_id: coachId,
      title: input.title,
      type: input.type,
      description: input.description,
      duration_min: input.duration_min,
      distance_km: input.distance_km,
      vma_percent: input.vma_percent,
      scheduled_at: input.scheduled_at,
      status: input.status,
    })
    .select()
    .single()
  if (error) throw error

  if (input.group_ids.length > 0) {
    const { error: assignError } = await supabase
      .from('session_assignments')
      .insert(input.group_ids.map((group_id) => ({ session_id: session.id, group_id })))
    if (assignError) throw assignError
  }
  return session
}

export interface AthleteSession {
  id: string
  title: string
  type: string
  description: string | null
  duration_min: number | null
  distance_km: number | null
  vma_percent: number | null
  scheduled_at: string
  completion: { status: string; rpe: number | null } | null
}

/** Sessions assigned to any group the athlete belongs to, in [from, to). */
export async function fetchAthleteSessions(profileId: string, from: string, to: string): Promise<AthleteSession[]> {
  const { data: memberships, error: memErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('profile_id', profileId)
  if (memErr) throw memErr
  const groupIds = (memberships ?? []).map((m) => m.group_id)
  if (groupIds.length === 0) return []

  const { data: assignments, error: assignErr } = await supabase
    .from('session_assignments')
    .select('session_id')
    .in('group_id', groupIds)
  if (assignErr) throw assignErr
  const sessionIds = [...new Set((assignments ?? []).map((a) => a.session_id))]
  if (sessionIds.length === 0) return []

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, title, type, description, duration_min, distance_km, vma_percent, scheduled_at')
    .in('id', sessionIds)
    .eq('status', 'published')
    .gte('scheduled_at', from)
    .lt('scheduled_at', to)
    .order('scheduled_at')
  if (error) throw error

  const { data: completions, error: compErr } = await supabase
    .from('session_completions')
    .select('session_id, status, rpe')
    .eq('profile_id', profileId)
    .in('session_id', sessionIds)
  if (compErr) throw compErr
  const byId = new Map((completions ?? []).map((c) => [c.session_id, c]))

  return (sessions ?? []).map((s) => ({ ...s, completion: byId.get(s.id) ?? null }))
}

export async function validateSession(sessionId: string, profileId: string, rpe: number | null, note: string) {
  const { error } = await supabase
    .from('session_completions')
    .upsert({ session_id: sessionId, profile_id: profileId, status: 'done', rpe, note, completed_at: new Date().toISOString() })
  if (error) throw error
}

export async function logFreeSession(profileId: string, title: string, distanceKm: number, durationMin: number) {
  const { error } = await supabase.from('session_completions').insert({
    session_id: null,
    profile_id: profileId,
    status: 'free_session',
    free_session_title: title,
    free_session_distance_km: distanceKm,
    free_session_duration_min: durationMin,
  })
  if (error) throw error
}

export async function fetchCoachSessions(clubId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, type, duration_min, distance_km, vma_percent, scheduled_at, status, session_assignments(group_id, groups(name))')
    .eq('club_id', clubId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data
}
