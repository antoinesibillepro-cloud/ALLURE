import { supabase } from '../supabase'

export interface TargetSplitInput {
  target_time_seconds: number
  distance_m: number | null
  recovery_seconds: number | null
}

export interface WorkBlockInput {
  group_id: string | null
  label: string
  content: string
  target_pace_sec_per_km: number | null
  is_rest: boolean
  target_splits: TargetSplitInput[]
}

export type SessionDiscipline = 'course' | 'velo' | 'natation' | 'muscu'

export interface SessionInput {
  title: string
  type: string
  description: string
  discipline: SessionDiscipline
  duration_min: number
  distance_km: number | null
  vma_percent: number | null
  scheduled_at: string // ISO date
  time_slot?: 'matin' | 'apres-midi' | null
  group_ids: string[]
  status: 'draft' | 'published'
  work_blocks?: WorkBlockInput[]
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
      discipline: input.discipline,
      duration_min: input.duration_min,
      distance_km: input.distance_km,
      vma_percent: input.vma_percent,
      scheduled_at: input.scheduled_at,
      time_slot: input.time_slot ?? null,
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

  if (input.work_blocks?.length) {
    for (const block of input.work_blocks) {
      const { data: workBlock, error: blockErr } = await supabase
        .from('session_work_blocks')
        .insert({
          session_id: session.id, group_id: block.group_id, label: block.label,
          content: block.content, target_pace_sec_per_km: block.target_pace_sec_per_km, is_rest: block.is_rest,
        })
        .select('id')
        .single()
      if (blockErr) throw blockErr
      if (block.target_splits.length > 0) {
        const { error: splitsErr } = await supabase.from('session_target_splits').insert(
          block.target_splits.map((sp, i) => ({
            work_block_id: workBlock.id, rep_number: i + 1,
            target_time_seconds: sp.target_time_seconds, distance_m: sp.distance_m, recovery_seconds: sp.recovery_seconds,
          })),
        )
        if (splitsErr) throw splitsErr
      }
    }
  }

  return session
}

export interface WorkBlockWithTargets {
  id: string
  group_id: string | null
  label: string | null
  content: string | null
  target_pace_sec_per_km: number | null
  is_rest: boolean
  target_splits: { rep_number: number; target_time_seconds: number; distance_m: number | null; recovery_seconds: number | null }[]
}

export async function fetchSessionWorkBlocks(sessionId: string): Promise<WorkBlockWithTargets[]> {
  const { data, error } = await supabase
    .from('session_work_blocks')
    .select('id, group_id, label, content, target_pace_sec_per_km, is_rest, session_target_splits(rep_number, target_time_seconds, distance_m, recovery_seconds)')
    .eq('session_id', sessionId)
  if (error) throw error
  return (data ?? []).map((b) => ({
    id: b.id, group_id: b.group_id, label: b.label, content: b.content,
    target_pace_sec_per_km: b.target_pace_sec_per_km, is_rest: b.is_rest,
    target_splits: (
      (b.session_target_splits ?? []) as { rep_number: number; target_time_seconds: number; distance_m: number | null; recovery_seconds: number | null }[]
    ).sort((a, c) => a.rep_number - c.rep_number),
  }))
}

export interface AthleteSession {
  id: string
  title: string
  type: string
  description: string | null
  discipline: SessionDiscipline
  duration_min: number | null
  distance_km: number | null
  vma_percent: number | null
  scheduled_at: string
  completion: { id: string; status: string; rpe: number | null; actual_distance_km: number | null; actual_duration_min: number | null } | null
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
    .select('id, title, type, description, discipline, duration_min, distance_km, vma_percent, scheduled_at')
    .in('id', sessionIds)
    .eq('status', 'published')
    .gte('scheduled_at', from)
    .lt('scheduled_at', to)
    .order('scheduled_at')
  if (error) throw error

  const { data: completions, error: compErr } = await supabase
    .from('session_completions')
    .select('id, session_id, status, rpe, actual_distance_km, actual_duration_min')
    .eq('profile_id', profileId)
    .in('session_id', sessionIds)
  if (compErr) throw compErr
  const byId = new Map((completions ?? []).map((c) => [c.session_id, c]))

  return (sessions ?? []).map((s) => ({ ...s, discipline: s.discipline as SessionDiscipline, completion: byId.get(s.id) ?? null }))
}

export async function validateSession(
  sessionId: string, profileId: string, rpe: number | null, note: string,
  actualDistanceKm?: number | null, actualDurationMin?: number | null,
): Promise<string> {
  const { data, error } = await supabase
    .from('session_completions')
    .upsert({
      session_id: sessionId, profile_id: profileId, status: 'done', rpe, note,
      actual_distance_km: actualDistanceKm ?? null, actual_duration_min: actualDurationMin ?? null,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'session_id,profile_id' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export interface SessionSplit { id: string; rep_number: number; time_seconds: number; recovery_seconds: number | null }

export async function saveSessionSplits(sessionCompletionId: string, splits: { rep_number: number; time_seconds: number; recovery_seconds?: number | null }[]) {
  const { error: delErr } = await supabase.from('session_splits').delete().eq('session_completion_id', sessionCompletionId)
  if (delErr) throw delErr
  if (splits.length === 0) return
  const { error } = await supabase.from('session_splits').insert(
    splits.map((s) => ({
      session_completion_id: sessionCompletionId, rep_number: s.rep_number, time_seconds: s.time_seconds,
      recovery_seconds: s.recovery_seconds ?? null,
    })),
  )
  if (error) throw error
}

export async function fetchSessionSplits(sessionCompletionId: string): Promise<SessionSplit[]> {
  const { data, error } = await supabase
    .from('session_splits')
    .select('id, rep_number, time_seconds, recovery_seconds')
    .eq('session_completion_id', sessionCompletionId)
    .order('rep_number')
  if (error) throw error
  return data
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
    .select('id, title, type, description, discipline, duration_min, distance_km, vma_percent, scheduled_at, status, time_slot, session_assignments(group_id, groups(name))')
    .eq('club_id', clubId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data
}

export interface SessionUpdateInput {
  title?: string
  type?: string
  description?: string
  duration_min?: number
  distance_km?: number
  vma_percent?: number
  scheduled_at?: string
  status?: 'draft' | 'published'
}

export async function updateSession(sessionId: string, patch: SessionUpdateInput) {
  const { error } = await supabase.from('sessions').update(patch).eq('id', sessionId)
  if (error) throw error
}

export async function deleteSession(sessionId: string) {
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) throw error
}

export interface AthleteRealization {
  profile_id: string
  name: string
  status: string
  rpe: number | null
  actual_distance_km: number | null
  actual_duration_min: number | null
  note: string | null
  splits: { rep_number: number; time_seconds: number; recovery_seconds: number | null }[]
}

/** Every club athlete's completion (if any) for a session, with splits. */
export async function fetchSessionRealizations(sessionId: string, groupIds: string[]): Promise<AthleteRealization[]> {
  if (groupIds.length === 0) return []
  const { data: members, error: memErr } = await supabase
    .from('group_members')
    .select('profile_id, profiles(id, name)')
    .in('group_id', groupIds)
  if (memErr) throw memErr
  const athletes = new Map<string, string>()
  for (const m of (members ?? []) as unknown as { profile_id: string; profiles: { id: string; name: string } | null }[]) {
    if (m.profiles) athletes.set(m.profiles.id, m.profiles.name)
  }

  const { data: completions, error } = await supabase
    .from('session_completions')
    .select('id, profile_id, status, rpe, actual_distance_km, actual_duration_min, note')
    .eq('session_id', sessionId)
  if (error) throw error

  const completionIds = (completions ?? []).map((c) => c.id)
  const { data: splitsRows } = completionIds.length
    ? await supabase.from('session_splits').select('session_completion_id, rep_number, time_seconds, recovery_seconds').in('session_completion_id', completionIds)
    : { data: [] }
  const splitsByCompletion = new Map<string, { rep_number: number; time_seconds: number; recovery_seconds: number | null }[]>()
  for (const s of splitsRows ?? []) {
    const arr = splitsByCompletion.get(s.session_completion_id) ?? []
    arr.push({ rep_number: s.rep_number, time_seconds: s.time_seconds, recovery_seconds: s.recovery_seconds })
    splitsByCompletion.set(s.session_completion_id, arr)
  }

  const byProfile = new Map((completions ?? []).map((c) => [c.profile_id, c]))
  return [...athletes.entries()].map(([id, name]) => {
    const c = byProfile.get(id)
    return {
      profile_id: id, name,
      status: c?.status ?? 'pending',
      rpe: c?.rpe ?? null,
      actual_distance_km: c?.actual_distance_km ?? null,
      actual_duration_min: c?.actual_duration_min ?? null,
      note: c?.note ?? null,
      splits: c ? (splitsByCompletion.get(c.id) ?? []) : [],
    }
  })
}

export interface AthleteHistoryEntry {
  id: string
  title: string
  type: string | null
  completed_at: string
  status: 'done' | 'skipped' | 'free_session'
  distance_km: number | null
  duration_min: number | null
  rpe: number | null
  note: string | null
  splits: { rep_number: number; time_seconds: number; recovery_seconds: number | null }[]
}

/** An athlete's completed sessions (club sessions + free sessions), most recent first — the coach's athlete-centric session history. */
export async function fetchAthleteSessionHistory(profileId: string, limit = 30): Promise<AthleteHistoryEntry[]> {
  const { data: completions, error } = await supabase
    .from('session_completions')
    .select(`
      id, status, rpe, note, completed_at,
      actual_distance_km, actual_duration_min,
      free_session_title, free_session_distance_km, free_session_duration_min,
      session:sessions(title, type, duration_min, distance_km)
    `)
    .eq('profile_id', profileId)
    .in('status', ['done', 'free_session'])
    .order('completed_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  const rows = (completions ?? []) as unknown as {
    id: string; status: 'done' | 'free_session'; rpe: number | null; note: string | null; completed_at: string
    actual_distance_km: number | null; actual_duration_min: number | null
    free_session_title: string | null; free_session_distance_km: number | null; free_session_duration_min: number | null
    session: { title: string; type: string; duration_min: number | null; distance_km: number | null } | null
  }[]

  const ids = rows.map((r) => r.id)
  const { data: splitsRows } = ids.length
    ? await supabase.from('session_splits').select('session_completion_id, rep_number, time_seconds, recovery_seconds').in('session_completion_id', ids).order('rep_number')
    : { data: [] }
  const splitsByCompletion = new Map<string, AthleteHistoryEntry['splits']>()
  for (const s of splitsRows ?? []) {
    const arr = splitsByCompletion.get(s.session_completion_id) ?? []
    arr.push({ rep_number: s.rep_number, time_seconds: s.time_seconds, recovery_seconds: s.recovery_seconds })
    splitsByCompletion.set(s.session_completion_id, arr)
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.status === 'free_session' ? (r.free_session_title ?? 'Séance libre') : (r.session?.title ?? 'Séance'),
    type: r.status === 'free_session' ? null : (r.session?.type ?? null),
    completed_at: r.completed_at,
    status: r.status,
    distance_km: r.status === 'free_session' ? r.free_session_distance_km : (r.actual_distance_km ?? r.session?.distance_km ?? null),
    duration_min: r.status === 'free_session' ? r.free_session_duration_min : (r.actual_duration_min ?? r.session?.duration_min ?? null),
    rpe: r.rpe,
    note: r.note,
    splits: splitsByCompletion.get(r.id) ?? [],
  }))
}
