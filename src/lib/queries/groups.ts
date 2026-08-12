import { supabase } from '../supabase'

export interface GroupMember {
  id: string
  name: string
  vma: number | null
}

export interface GroupWithMembers {
  id: string
  name: string
  level: string | null
  members: GroupMember[]
}

export async function fetchGroups(clubId: string): Promise<GroupWithMembers[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, level, group_members(profile:profiles(id, name, vma))')
    .eq('club_id', clubId)
    .order('name')
  if (error) throw error
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    level: g.level,
    members: (g.group_members ?? [])
      // `Database` types are a placeholder until `supabase gen types` runs against the real schema,
      // so supabase-js can't infer this join as to-one yet — cast until then.
      .map((m: unknown) => (m as { profile: GroupMember }).profile)
      .filter(Boolean),
  }))
}

export async function createGroup(clubId: string, coachId: string, name: string, level: string | null) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ club_id: clubId, created_by: coachId, name, level })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addAthleteToGroup(groupId: string, profileId: string) {
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, profile_id: profileId })
  if (error) throw error
}

export async function removeAthleteFromGroup(groupId: string, profileId: string) {
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('profile_id', profileId)
  if (error) throw error
}

export async function fetchClubAthletes(clubId: string) {
  const { data, error } = await supabase.from('profiles').select('id, name, vma').eq('club_id', clubId).eq('role', 'athlete').order('name')
  if (error) throw error
  return data
}
