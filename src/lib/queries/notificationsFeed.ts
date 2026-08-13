import { supabase } from '../supabase'
import { fetchUnreadCounts } from './messages'

export type NotifKind = 'message' | 'session' | 'race'

export interface NotifItem {
  id: string
  kind: NotifKind
  title: string
  detail: string
  /** ISO date used for ordering and the relative label. */
  at: string
}

function relative(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now()
  const days = Math.round(diffMs / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days === -1) return 'hier'
  if (days > 1) return `dans ${days} jours`
  return `il y a ${Math.abs(days)} jours`
}

/**
 * Real notification feed: unread conversations, the athlete's next sessions,
 * and the club's upcoming races. Ordered soonest-first.
 */
export async function fetchNotifications(profileId: string, clubId: string, isCoach: boolean): Promise<NotifItem[]> {
  const items: NotifItem[] = []
  const todayIso = new Date().toISOString().slice(0, 10)

  // ── Unread messages, grouped per conversation ──
  const { byConversation } = await fetchUnreadCounts(profileId)
  const unreadIds = Object.keys(byConversation)
  if (unreadIds.length) {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, kind, title, conversation_participants(profile_id, profile:profiles(name))')
      .in('id', unreadIds)
    for (const c of (convs ?? []) as unknown as {
      id: string; kind: string; title: string | null
      conversation_participants: { profile_id: string; profile: { name: string } | null }[]
    }[]) {
      let label = c.title ?? 'Conversation'
      if (c.kind === 'dm') {
        const other = c.conversation_participants?.find((p) => p.profile_id !== profileId)
        label = other?.profile?.name ?? label
      }
      const n = byConversation[c.id]
      items.push({
        id: `msg-${c.id}`,
        kind: 'message',
        title: label,
        detail: `${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}`,
        at: new Date().toISOString(),
      })
    }
  }

  // ── Upcoming sessions ──
  if (isCoach) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, title, scheduled_at')
      .eq('club_id', clubId)
      .eq('status', 'published')
      .gte('scheduled_at', todayIso)
      .order('scheduled_at', { ascending: true })
      .limit(3)
    for (const s of sessions ?? []) {
      items.push({ id: `ses-${s.id}`, kind: 'session', title: s.title, detail: `Séance ${relative(s.scheduled_at)}`, at: s.scheduled_at })
    }
  } else {
    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('profile_id', profileId)
    const groupIds = (memberships ?? []).map((m) => m.group_id)
    if (groupIds.length) {
      const { data: assignments } = await supabase.from('session_assignments').select('session_id').in('group_id', groupIds)
      const sessionIds = [...new Set((assignments ?? []).map((a) => a.session_id))]
      if (sessionIds.length) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, title, scheduled_at')
          .in('id', sessionIds)
          .eq('status', 'published')
          .gte('scheduled_at', todayIso)
          .order('scheduled_at', { ascending: true })
          .limit(3)
        for (const s of sessions ?? []) {
          items.push({ id: `ses-${s.id}`, kind: 'session', title: s.title, detail: `Séance ${relative(s.scheduled_at)}`, at: s.scheduled_at })
        }
      }
    }
  }

  // ── Upcoming races ──
  const { data: races } = await supabase
    .from('club_races')
    .select('id, title, event_date, location')
    .eq('club_id', clubId)
    .gte('event_date', todayIso)
    .order('event_date', { ascending: true })
    .limit(3)
  for (const r of races ?? []) {
    items.push({
      id: `race-${r.id}`,
      kind: 'race',
      title: r.title,
      detail: [relative(r.event_date), r.location].filter(Boolean).join(' · '),
      at: r.event_date,
    })
  }

  // Unread messages first, then whatever happens soonest.
  return items.sort((a, b) => {
    if (a.kind === 'message' && b.kind !== 'message') return -1
    if (b.kind === 'message' && a.kind !== 'message') return 1
    return a.at.localeCompare(b.at)
  })
}
