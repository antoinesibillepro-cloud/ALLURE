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

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - day)
  return s
}

/** Ensures a club-wide weekly km challenge exists for the current week, auto-creating it if missing. */
export async function ensureWeeklyClubChallenge(clubId: string, coachId: string): Promise<void> {
  const weekStart = isoDate(startOfWeek(new Date()))
  const weekEnd = isoDate(new Date(startOfWeek(new Date()).getTime() + 6 * 86400000))

  const { data: existing } = await supabase
    .from('challenges')
    .select('id')
    .eq('club_id', clubId)
    .eq('kind', 'km')
    .is('group_id', null)
    .eq('start_date', weekStart)
    .maybeSingle()
  if (existing) return

  const { count: athleteCount } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('role', 'athlete')
  const target = Math.max(100, (athleteCount ?? 0) * 15)

  const { error } = await supabase.from('challenges').insert({
    club_id: clubId, created_by: coachId,
    title: `Défi hebdo du club — semaine du ${new Date(weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
    kind: 'km', target_value: target, start_date: weekStart, end_date: weekEnd, group_id: null,
  })
  if (error) throw error
}

export interface RankingEntry { profileId: string; name: string; value: number }
export interface WeeklyRankings { km: RankingEntry[]; assiduite: RankingEntry[]; recuperation: RankingEntry[] }

/** Standing club-wide rankings for the current week: km, assiduité (%), récupération (forme moyenne %). */
export async function fetchWeeklyRankings(clubId: string): Promise<WeeklyRankings> {
  const weekStart = isoDate(startOfWeek(new Date()))
  const weekEnd = isoDate(new Date(startOfWeek(new Date()).getTime() + 7 * 86400000))

  const { data: athletes } = await supabase.from('profiles').select('id, name').eq('club_id', clubId).eq('role', 'athlete')
  const profileIds = (athletes ?? []).map((a) => a.id)
  const nameById = new Map((athletes ?? []).map((a) => [a.id, a.name]))
  if (profileIds.length === 0) return { km: [], assiduite: [], recuperation: [] }

  // Km this week
  const { data: completions } = await supabase
    .from('session_completions')
    .select('profile_id, status, free_session_distance_km, session:sessions(distance_km)')
    .in('profile_id', profileIds)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', weekStart)
    .lt('completed_at', weekEnd)
  const kmByProfile = new Map<string, number>()
  for (const c of (completions ?? []) as unknown as Array<{ profile_id: string; status: string; free_session_distance_km: number | null; session: { distance_km: number | null } | null }>) {
    const km = c.status === 'free_session' ? (c.free_session_distance_km ?? 0) : (c.session?.distance_km ?? 0)
    kmByProfile.set(c.profile_id, (kmByProfile.get(c.profile_id) ?? 0) + km)
  }

  // Assiduité this week: done / assigned published sessions
  const { data: memberships } = await supabase.from('group_members').select('profile_id, group_id').in('profile_id', profileIds)
  const groupsByProfile = new Map<string, string[]>()
  for (const m of memberships ?? []) groupsByProfile.set(m.profile_id, [...(groupsByProfile.get(m.profile_id) ?? []), m.group_id])

  const allGroupIds = [...new Set((memberships ?? []).map((m) => m.group_id))]
  const { data: assignments } = allGroupIds.length
    ? await supabase.from('session_assignments').select('session_id, group_id').in('group_id', allGroupIds)
    : { data: [] }
  const sessionsByGroup = new Map<string, string[]>()
  for (const a of assignments ?? []) sessionsByGroup.set(a.group_id, [...(sessionsByGroup.get(a.group_id) ?? []), a.session_id])
  const allSessionIds = [...new Set((assignments ?? []).map((a) => a.session_id))]
  const { data: weekSessions } = allSessionIds.length
    ? await supabase.from('sessions').select('id').in('id', allSessionIds).eq('status', 'published').gte('scheduled_at', weekStart).lt('scheduled_at', weekEnd)
    : { data: [] }
  const weekSessionIds = new Set((weekSessions ?? []).map((s) => s.id))

  const doneSessionsByProfile = new Map<string, Set<string>>()
  const { data: doneRows } = await supabase
    .from('session_completions')
    .select('profile_id, session_id')
    .in('profile_id', profileIds)
    .eq('status', 'done')
    .gte('completed_at', weekStart)
    .lt('completed_at', weekEnd)
  for (const r of doneRows ?? []) {
    if (!r.session_id) continue
    const set = doneSessionsByProfile.get(r.profile_id) ?? new Set<string>()
    set.add(r.session_id)
    doneSessionsByProfile.set(r.profile_id, set)
  }

  const assiduite: RankingEntry[] = profileIds.map((id) => {
    const groupIds = groupsByProfile.get(id) ?? []
    const assignedSessionIds = new Set<string>()
    for (const gid of groupIds) for (const sid of sessionsByGroup.get(gid) ?? []) if (weekSessionIds.has(sid)) assignedSessionIds.add(sid)
    const done = doneSessionsByProfile.get(id) ?? new Set<string>()
    const doneCount = [...done].filter((sid) => assignedSessionIds.has(sid)).length
    const value = assignedSessionIds.size > 0 ? Math.round((doneCount / assignedSessionIds.size) * 100) : 0
    return { profileId: id, name: nameById.get(id) ?? '', value }
  }).sort((a, b) => b.value - a.value)

  // Récupération: average composite forme score over the last 7 days
  const since = isoDate(new Date(Date.now() - 7 * 86400000))
  const { data: checkins } = await supabase
    .from('daily_checkins')
    .select('profile_id, sleep, fatigue, stress, soreness, motivation')
    .in('profile_id', profileIds)
    .gte('date', since)
  const pctSums = new Map<string, { sum: number; count: number }>()
  for (const row of checkins ?? []) {
    const sleepScore = Math.min(1, (row.sleep ?? 0) / 8)
    const motivationScore = (row.motivation ?? 0) / 10
    const fatigueScore = 1 - (row.fatigue ?? 0) / 10
    const stressScore = 1 - (row.stress ?? 0) / 10
    const sorenessScore = 1 - (row.soreness ?? 0) / 10
    const pct = ((sleepScore + motivationScore + fatigueScore + stressScore + sorenessScore) / 5) * 100
    const acc = pctSums.get(row.profile_id) ?? { sum: 0, count: 0 }
    acc.sum += pct; acc.count += 1
    pctSums.set(row.profile_id, acc)
  }
  const recuperation: RankingEntry[] = profileIds
    .filter((id) => pctSums.has(id))
    .map((id) => ({ profileId: id, name: nameById.get(id) ?? '', value: Math.round((pctSums.get(id)!.sum / pctSums.get(id)!.count)) }))
    .sort((a, b) => b.value - a.value)

  const km: RankingEntry[] = profileIds.map((id) => ({ profileId: id, name: nameById.get(id) ?? '', value: +((kmByProfile.get(id) ?? 0).toFixed(1)) }))
    .sort((a, b) => b.value - a.value)

  return { km, assiduite, recuperation }
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
