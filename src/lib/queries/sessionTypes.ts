import { supabase } from '../supabase'

export interface SessionTypeRow {
  id: string
  name: string
  color: string
}

export const SESSION_TYPE_PALETTE = [
  '#F2C400', '#5B91D8', '#E4574A', '#5EBA65', '#7B6FD6',
  '#F2924D', '#4FC3D9', '#D65DB1', '#6B7280', '#3DBE9C',
]

export async function fetchSessionTypes(clubId: string): Promise<SessionTypeRow[]> {
  const { data, error } = await supabase.from('session_types').select('id, name, color').eq('club_id', clubId).order('name')
  if (error) throw error
  return data
}

export async function createSessionType(clubId: string, name: string, color?: string) {
  const { error } = await supabase.from('session_types').insert({
    club_id: clubId, name, color: color ?? SESSION_TYPE_PALETTE[Math.floor(Math.random() * SESSION_TYPE_PALETTE.length)],
  })
  if (error) throw error
}

export async function renameSessionType(id: string, name: string) {
  const { error } = await supabase.from('session_types').update({ name }).eq('id', id)
  if (error) throw error
}

export async function updateSessionTypeColor(id: string, color: string) {
  const { error } = await supabase.from('session_types').update({ color }).eq('id', id)
  if (error) throw error
}

export async function deleteSessionType(id: string) {
  const { error } = await supabase.from('session_types').delete().eq('id', id)
  if (error) throw error
}
