import { supabase } from '../supabase'

export type ChallengeKind = 'km' | 'sessions' | 'attendance'

export interface Challenge {
  id: string
  title: string
  kind: ChallengeKind
  target_value: number
  start_date: string
  end_date: string
  group_id: string | null
}

export async function fetchChallenges(clubId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, kind, target_value, start_date, end_date, group_id')
    .eq('club_id', clubId)
    .order('end_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createChallenge(clubId: string, coachId: string, input: Omit<Challenge, 'id'>) {
  const { error } = await supabase.from('challenges').insert({ club_id: clubId, created_by: coachId, ...input })
  if (error) throw error
}

export async function deleteChallenge(id: string) {
  const { error } = await supabase.from('challenges').delete().eq('id', id)
  if (error) throw error
}

export interface LeaderboardEntry {
  profileId: string
  name: string
  progress: number
}

/** Progress per athlete in the club (or challenge's group) for a challenge's date range. */
export async function fetchChallengeLeaderboard(challenge: Challenge, clubId: string): Promise<LeaderboardEntry[]> {
  let profileIds: string[]
  if (challenge.group_id) {
    const { data: members } = await supabase.from('group_members').select('profile_id').eq('group_id', challenge.group_id)
    profileIds = (members ?? []).map((m) => m.profile_id)
  } else {
    const { data: athletes } = await supabase.from('profiles').select('id').eq('club_id', clubId).eq('role', 'athlete')
    profileIds = (athletes ?? []).map((a) => a.id)
  }
  if (profileIds.length === 0) return []

  const { data: names } = await supabase.from('profiles').select('id, name').in('id', profileIds)
  const nameById = new Map((names ?? []).map((n) => [n.id, n.name]))

  const endExclusive = new Date(new Date(challenge.end_date).getTime() + 86400000).toISOString().slice(0, 10)

  if (challenge.kind === 'attendance') {
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('profile_id, date')
      .in('profile_id', profileIds)
      .gte('date', challenge.start_date)
      .lt('date', endExclusive)
    const counts = new Map<string, number>()
    for (const c of checkins ?? []) counts.set(c.profile_id, (counts.get(c.profile_id) ?? 0) + 1)
    return profileIds.map((id) => ({ profileId: id, name: nameById.get(id) ?? '', progress: counts.get(id) ?? 0 }))
      .sort((a, b) => b.progress - a.progress)
  }

  const { data: completions } = await supabase
    .from('session_completions')
    .select('profile_id, status, free_session_distance_km, session:sessions(distance_km)')
    .in('profile_id', profileIds)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', challenge.start_date)
    .lt('completed_at', endExclusive)

  const progress = new Map<string, number>()
  for (const c of (completions ?? []) as unknown as Array<{ profile_id: string; status: string; free_session_distance_km: number | null; session: { distance_km: number | null } | null }>) {
    const inc = challenge.kind === 'sessions' ? 1 : (c.status === 'free_session' ? (c.free_session_distance_km ?? 0) : (c.session?.distance_km ?? 0))
    progress.set(c.profile_id, (progress.get(c.profile_id) ?? 0) + inc)
  }
  return profileIds.map((id) => ({ profileId: id, name: nameById.get(id) ?? '', progress: progress.get(id) ?? 0 }))
    .sort((a, b) => b.progress - a.progress)
}
