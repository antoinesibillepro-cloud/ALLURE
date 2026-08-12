import { supabase } from '../supabase'

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

// ── Leaderboards ──────────────────────────────────────────────────────────

export type LeaderKey = 'assiduite' | 'kilometrage' | 'vma'

export interface LeaderRow {
  profileId: string
  name: string
  groupName: string
  value: number
  unit: string
}

async function fetchAthletesWithGroup(clubId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, vma, group_members(groups(name))')
    .eq('club_id', clubId)
    .eq('role', 'athlete')
  if (error) throw error
  return (data ?? []).map((p: unknown) => {
    const row = p as { id: string; name: string; vma: number | null; group_members: { groups: { name: string } | null }[] }
    return { id: row.id, name: row.name, vma: row.vma, groupName: row.group_members?.[0]?.groups?.name ?? '—' }
  })
}

/**
 * Assiduité mirrors the "attendance" challenge kind (checkins over the period).
 * Kilométrage is completed/free-session distance over the last 7 days.
 * VMA ranks current profiles.vma — there's no VMA history table, so this is a
 * snapshot ranking rather than a "progression" board.
 */
export async function fetchClubLeaderboards(clubId: string): Promise<Record<LeaderKey, LeaderRow[]>> {
  const athletes = await fetchAthletesWithGroup(clubId)
  const athleteIds = athletes.map((a) => a.id)
  const byId = new Map(athletes.map((a) => [a.id, a]))
  if (athleteIds.length === 0) return { assiduite: [], kilometrage: [], vma: [] }

  const periodStart = isoDate(new Date(Date.now() - 30 * 24 * 3600 * 1000))
  const { data: checkins } = await supabase
    .from('daily_checkins')
    .select('profile_id, date')
    .in('profile_id', athleteIds)
    .gte('date', periodStart)
  const checkinCounts = new Map<string, number>()
  for (const c of checkins ?? []) checkinCounts.set(c.profile_id, (checkinCounts.get(c.profile_id) ?? 0) + 1)

  const weekStart = isoDate(new Date(Date.now() - 7 * 24 * 3600 * 1000))
  const { data: kmRows } = await supabase
    .from('session_completions')
    .select('profile_id, status, free_session_distance_km, session:sessions(distance_km)')
    .in('profile_id', athleteIds)
    .in('status', ['done', 'free_session'])
    .gte('completed_at', weekStart)
  const kmByProfile = new Map<string, number>()
  for (const c of (kmRows ?? []) as unknown as Array<{
    profile_id: string; status: string; free_session_distance_km: number | null
    session: { distance_km: number | null } | null
  }>) {
    const km = c.status === 'free_session' ? (c.free_session_distance_km ?? 0) : (c.session?.distance_km ?? 0)
    kmByProfile.set(c.profile_id, (kmByProfile.get(c.profile_id) ?? 0) + km)
  }

  const toRow = (id: string, value: number, unit: string): LeaderRow => {
    const a = byId.get(id)
    return { profileId: id, name: a?.name ?? '', groupName: a?.groupName ?? '—', value, unit }
  }

  return {
    assiduite: [...checkinCounts.entries()]
      .map(([id, n]) => toRow(id, Math.min(100, Math.round((n / 30) * 100)), '%'))
      .sort((a, b) => b.value - a.value),
    kilometrage: [...kmByProfile.entries()]
      .map(([id, km]) => toRow(id, Math.round(km * 10) / 10, 'km'))
      .sort((a, b) => b.value - a.value),
    vma: athletes
      .filter((a): a is typeof a & { vma: number } => a.vma != null)
      .map((a) => toRow(a.id, a.vma, 'km/h'))
      .sort((a, b) => b.value - a.value),
  }
}

// ── Recent club records ──────────────────────────────────────────────────

export interface ClubRecord {
  id: string
  profileId: string
  name: string
  discipline: string
  value: string
  date: string
  isSeasonBest: boolean
}

/** Personal records across the whole club (readable club-wide per RLS), most recent first. */
export async function fetchClubRecentRecords(clubId: string, limit = 6): Promise<ClubRecord[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('id, profile_id, discipline, value, date, is_season_best, profile:profiles!inner(name, club_id)')
    .eq('profile.club_id', clubId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((r: unknown) => {
    const row = r as {
      id: string; profile_id: string; discipline: string; value: string; date: string
      is_season_best: boolean; profile: { name: string }
    }
    return {
      id: row.id, profileId: row.profile_id, name: row.profile.name, discipline: row.discipline,
      value: row.value, date: row.date, isSeasonBest: row.is_season_best,
    }
  })
}

// ── Club competition calendar ────────────────────────────────────────────
// `competitions` rows are per-athlete; upcoming events are grouped by
// (title, event_date) to approximate a shared club calendar with registrants.

export interface ClubCompetitionEvent {
  key: string
  title: string
  eventDate: string
  distanceKm: number | null
  targetTime: string | null
  registrants: { profileId: string; name: string; competitionId: string }[]
}

export async function fetchClubCompetitions(clubId: string): Promise<ClubCompetitionEvent[]> {
  const { data, error } = await supabase
    .from('competitions')
    .select('id, profile_id, title, event_date, distance_km, target_time, profile:profiles!inner(name, club_id)')
    .eq('kind', 'competition')
    .eq('profile.club_id', clubId)
    .not('event_date', 'is', null)
    .gte('event_date', isoDate(new Date()))
    .order('event_date', { ascending: true })
  if (error) throw error

  const groups = new Map<string, ClubCompetitionEvent>()
  for (const r of (data ?? []) as unknown as Array<{
    id: string; profile_id: string; title: string; event_date: string
    distance_km: number | null; target_time: string | null; profile: { name: string }
  }>) {
    const key = `${r.title}|${r.event_date}`
    const g = groups.get(key) ?? {
      key, title: r.title, eventDate: r.event_date, distanceKm: r.distance_km, targetTime: r.target_time, registrants: [],
    }
    g.registrants.push({ profileId: r.profile_id, name: r.profile.name, competitionId: r.id })
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => a.eventDate.localeCompare(b.eventDate))
}
