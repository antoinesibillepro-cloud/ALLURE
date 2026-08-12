import { supabase } from '../supabase'

export interface ConversationSummary {
  id: string
  kind: 'dm' | 'group' | 'announcement'
  title: string | null
  group_id: string | null
  last_message: string | null
  last_message_at: string | null
}

export async function fetchConversations(profileId: string, clubId: string): Promise<ConversationSummary[]> {
  const { data: participantRows } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('profile_id', profileId)
  const participantIds = (participantRows ?? []).map((r) => r.conversation_id)

  const { data, error } = await supabase
    .from('conversations')
    .select('id, kind, title, group_id, messages(body, created_at)')
    .eq('club_id', clubId)
    .or(participantIds.length > 0 ? `id.in.(${participantIds.join(',')}),kind.eq.announcement` : 'kind.eq.announcement')
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((c) => {
    const msgs = (c.messages ?? []) as { body: string; created_at: string }[]
    const last = msgs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    return {
      id: c.id, kind: c.kind, title: c.title, group_id: c.group_id,
      last_message: last?.body ?? null, last_message_at: last?.created_at ?? null,
    }
  })
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id, sender:profiles(name)')
    .eq('conversation_id', conversationId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body })
  if (error) throw error
}

export async function createAnnouncement(clubId: string, coachId: string, title: string) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ club_id: clubId, kind: 'announcement', title, created_by: coachId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createGroupConversation(clubId: string, coachId: string, groupId: string, title: string, memberIds: string[]) {
  const { data: convo, error } = await supabase
    .from('conversations')
    .insert({ club_id: clubId, kind: 'group', group_id: groupId, title, created_by: coachId })
    .select()
    .single()
  if (error) throw error

  const rows = [...new Set([coachId, ...memberIds])].map((profile_id) => ({ conversation_id: convo.id, profile_id }))
  const { error: partErr } = await supabase.from('conversation_participants').insert(rows)
  if (partErr) throw partErr
  return convo
}

export function subscribeToConversation(conversationId: string, onInsert: () => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, onInsert)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
