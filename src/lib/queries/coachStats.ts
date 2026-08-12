import { supabase } from '../supabase'

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - day)
  return s
}

export interface GroupCompletion {
  id: string
  name: string
  memberCount: number
  completed: number
  total: number
}

/** For each group: how many (athlete × published session this week) pairs are done. */
export async function fetchGroupCompletionThisWeek(clubId: string): Promise<GroupCompletion[]> {
  const weekStart = isoDate(startOfWeek(new Date()))
  const weekEnd = isoDate(new Date(startOfWeek(new Date()).getTime() + 7 * 24 * 3600 * 1000))

  const { data: groups } = await supabase.from('groups').select('id, name').eq('club_id', clubId)
  if (!groups?.length) return []

  const results: GroupCompletion[] = []
  for (const g of groups) {
    const { data: members } = await supabase.from('group_members').select('profile_id').eq('group_id', g.id)
    const memberIds = (members ?? []).map((m) => m.profile_id)

    const { data: assignments } = await supabase.from('session_assignments').select('session_id').eq('group_id', g.id)
    const sessionIds = [...new Set((assignments ?? []).map((a) => a.session_id))]

    let total = 0
    let completed = 0
    if (sessionIds.length > 0 && memberIds.length > 0) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .in('id', sessionIds)
        .eq('status', 'published')
        .gte('scheduled_at', weekStart)
        .lt('scheduled_at', weekEnd)
      const weekSessionIds = (sessions ?? []).map((s) => s.id)
      total = weekSessionIds.length * memberIds.length

      if (weekSessionIds.length > 0) {
        const { data: completions } = await supabase
          .from('session_completions')
          .select('id')
          .in('session_id', weekSessionIds)
          .in('profile_id', memberIds)
          .eq('status', 'done')
        completed = completions?.length ?? 0
      }
    }

    results.push({ id: g.id, name: g.name, memberCount: memberIds.length, completed, total })
  }
  return results
}

export interface ActivityItem {
  id: string
  name: string
  action: string
  detail: string
  time: string
}

/** Recent session validations across the club, most recent first. */
export async function fetchClubActivityFeed(clubId: string, limit = 8): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from('session_completions')
    .select('id, status, completed_at, free_session_title, profile:profiles!inner(name, club_id), session:sessions(title)')
    .eq('profile.club_id', clubId)
    .order('completed_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((c: unknown) => {
    const row = c as { id: string; status: string; completed_at: string; free_session_title: string | null; profile: { name: string }; session: { title: string } | null }
    return {
      id: row.id,
      name: row.profile.name,
      action: row.status === 'free_session' ? 'a enregistré une séance libre' : 'a complété sa séance',
      detail: row.session?.title ?? row.free_session_title ?? '',
      time: new Date(row.completed_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    }
  })
}

export interface ClubKpis {
  activeAthletes: number
  sessionsPublished: number
  completionRate: number
}

export async function fetchClubKpis(clubId: string): Promise<ClubKpis> {
  const { count: activeAthletes } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('role', 'athlete')

  const weekStart = isoDate(startOfWeek(new Date()))
  const weekEnd = isoDate(new Date(startOfWeek(new Date()).getTime() + 7 * 24 * 3600 * 1000))
  const { count: sessionsPublished } = await supabase
    .from('sessions').select('id', { count: 'exact', head: true })
    .eq('club_id', clubId).eq('status', 'published').gte('scheduled_at', weekStart).lt('scheduled_at', weekEnd)

  const groups = await fetchGroupCompletionThisWeek(clubId)
  const totalDone = groups.reduce((s, g) => s + g.completed, 0)
  const totalPlanned = groups.reduce((s, g) => s + g.total, 0)

  return {
    activeAthletes: activeAthletes ?? 0,
    sessionsPublished: sessionsPublished ?? 0,
    completionRate: totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0,
  }
}

export interface TopAthlete { name: string; groupName: string; km: number }

export async function fetchTopAthletesThisWeek(clubId: string, limit = 5): Promise<TopAthlete[]> {
  const weekStart = isoDate(startOfWeek(new Date()))
  const weekEnd = isoDate(new Date(startOfWeek(new Date()).getTime() + 7 * 24 * 3600 * 1000))

  const { data: completions } = await supabase
    .from('session_completions')
    .select('profile_id, status, free_session_distance_km, session:sessions(distance_km), profile:profiles!inner(name, club_id, group_members(groups(name)))')
    .eq('profile.club_id', clubId)
    .gte('completed_at', weekStart)
    .lt('completed_at', weekEnd)

  const kmByProfile = new Map<string, { name: string; groupName: string; km: number }>()
  for (const c of (completions ?? []) as unknown as Array<{
    profile_id: string; status: string; free_session_distance_km: number | null
    session: { distance_km: number | null } | null
    profile: { name: string; group_members: { groups: { name: string } | null }[] }
  }>) {
    const km = c.status === 'free_session' ? (c.free_session_distance_km ?? 0) : (c.session?.distance_km ?? 0)
    const prev = kmByProfile.get(c.profile_id)
    const groupName = c.profile.group_members?.[0]?.groups?.name ?? '—'
    kmByProfile.set(c.profile_id, { name: c.profile.name, groupName, km: (prev?.km ?? 0) + km })
  }

  return [...kmByProfile.values()].sort((a, b) => b.km - a.km).slice(0, limit)
}
