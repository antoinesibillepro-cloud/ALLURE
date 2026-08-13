import { supabase } from '../supabase'

export type SearchKind = 'athlete' | 'group' | 'session' | 'race'

export interface SearchResult {
  id: string
  kind: SearchKind
  title: string
  subtitle: string
}

const KIND_LABEL: Record<SearchKind, string> = {
  athlete: 'Athlète', group: 'Groupe', session: 'Séance', race: 'Course',
}
export { KIND_LABEL }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Cross-entity search over the club: athletes, groups, sessions and races.
 * Each entity is capped so one type can't crowd out the others.
 */
export async function searchClub(clubId: string, term: string): Promise<SearchResult[]> {
  const q = term.trim()
  if (q.length < 2) return []
  const like = `%${q}%`

  const [athletes, groups, sessions, races] = await Promise.all([
    supabase.from('profiles').select('id, name, category, role').eq('club_id', clubId).ilike('name', like).limit(6),
    supabase.from('groups').select('id, name, level').eq('club_id', clubId).ilike('name', like).limit(4),
    supabase.from('sessions').select('id, title, scheduled_at, status').eq('club_id', clubId).ilike('title', like).order('scheduled_at', { ascending: false }).limit(5),
    supabase.from('club_races').select('id, title, event_date, location').eq('club_id', clubId).ilike('title', like).order('event_date', { ascending: true }).limit(4),
  ])

  const results: SearchResult[] = []

  for (const a of athletes.data ?? []) {
    results.push({
      id: a.id,
      kind: 'athlete',
      title: a.name,
      subtitle: a.role === 'coach' ? 'Coach' : (a.category ?? 'Athlète'),
    })
  }
  for (const g of groups.data ?? []) {
    results.push({ id: g.id, kind: 'group', title: g.name, subtitle: g.level ?? 'Groupe' })
  }
  for (const s of sessions.data ?? []) {
    results.push({
      id: s.id,
      kind: 'session',
      title: s.title,
      subtitle: `${fmtDate(s.scheduled_at)}${s.status === 'draft' ? ' · brouillon' : ''}`,
    })
  }
  for (const r of races.data ?? []) {
    results.push({
      id: r.id,
      kind: 'race',
      title: r.title,
      subtitle: [fmtDate(r.event_date), r.location].filter(Boolean).join(' · '),
    })
  }

  return results
}
