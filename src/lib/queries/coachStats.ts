import { supabase } from '../supabase'
import { fetchLatestWellnessScores } from './stats'

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

export interface VigilanceAthlete {
  id: string
  name: string
  groupName: string
  completionRate: number | null // last 2 weeks, null if no sessions assigned
  formePct: number | null
  status: 'alerte' | 'attention' | 'ok'
}

/** Athletes flagged for low recent completion and/or low wellness — for the coach dashboard. */
export async function fetchAthleteVigilance(clubId: string): Promise<VigilanceAthlete[]> {
  const { data: athletes } = await supabase
    .from('profiles')
    .select('id, name, group_members(groups(name))')
    .eq('club_id', clubId)
    .eq('role', 'athlete')
  if (!athletes?.length) return []

  const twoWeeksAgo = isoDate(new Date(Date.now() - 14 * 24 * 3600 * 1000))
  const now = isoDate(new Date(Date.now() + 24 * 3600 * 1000))

  const wellness = await fetchLatestWellnessScores(clubId)

  const results: VigilanceAthlete[] = []
  for (const a of athletes as unknown as { id: string; name: string; group_members: { groups: { name: string } | null }[] }[]) {
    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('profile_id', a.id)
    const groupIds = (memberships ?? []).map((m) => m.group_id)

    let completionRate: number | null = null
    if (groupIds.length > 0) {
      const { data: assignments } = await supabase.from('session_assignments').select('session_id').in('group_id', groupIds)
      const sessionIds = [...new Set((assignments ?? []).map((r) => r.session_id))]
      if (sessionIds.length > 0) {
        const { data: sessions } = await supabase
          .from('sessions').select('id').in('id', sessionIds).eq('status', 'published')
          .gte('scheduled_at', twoWeeksAgo).lt('scheduled_at', now)
        const recentIds = (sessions ?? []).map((s) => s.id)
        if (recentIds.length > 0) {
          const { data: completions } = await supabase
            .from('session_completions').select('id').eq('profile_id', a.id).in('session_id', recentIds).eq('status', 'done')
          completionRate = Math.round(((completions?.length ?? 0) / recentIds.length) * 100)
        }
      }
    }

    const formePct = wellness[a.id]?.pct ?? null
    const groupName = a.group_members?.[0]?.groups?.name ?? '—'

    let status: 'alerte' | 'attention' | 'ok' = 'ok'
    const lowCompletion = completionRate !== null && completionRate < 50
    const lowForme = formePct !== null && formePct < 40
    if (lowCompletion && lowForme) status = 'alerte'
    else if (lowCompletion || lowForme) status = 'attention'

    results.push({ id: a.id, name: a.name, groupName, completionRate, formePct, status })
  }

  const order = { alerte: 0, attention: 1, ok: 2 }
  return results.sort((x, y) => order[x.status] - order[y.status])
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
