import { supabase } from '../supabase'

export interface SessionTypeRow {
  id: string
  name: string
}

export async function fetchSessionTypes(clubId: string): Promise<SessionTypeRow[]> {
  const { data, error } = await supabase.from('session_types').select('id, name').eq('club_id', clubId).order('name')
  if (error) throw error
  return data
}

export async function createSessionType(clubId: string, name: string) {
  const { error } = await supabase.from('session_types').insert({ club_id: clubId, name })
  if (error) throw error
}

export async function renameSessionType(id: string, name: string) {
  const { error } = await supabase.from('session_types').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteSessionType(id: string) {
  const { error } = await supabase.from('session_types').delete().eq('id', id)
  if (error) throw error
}
