import { supabase } from '../supabase'

export interface ClubMember {
  id: string
  name: string
  email: string
  role: 'athlete' | 'coach'
  vma: number | null
  created_at: string
}

export async function fetchClubMembers(clubId: string): Promise<ClubMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, vma, created_at')
    .eq('club_id', clubId)
    .order('role', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function updateMemberRole(profileId: string, role: 'athlete' | 'coach') {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
  if (error) throw error
}

export async function removeMember(profileId: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', profileId)
  if (error) throw error
}

export async function updateClubName(clubId: string, name: string) {
  const { error } = await supabase.from('clubs').update({ name }).eq('id', clubId)
  if (error) throw error
}

export interface ClubInvite {
  code: string
  role: 'athlete' | 'coach'
  max_uses: number
  uses: number
  created_at: string
}

export async function fetchClubInvites(clubId: string): Promise<ClubInvite[]> {
  const { data, error } = await supabase
    .from('club_invites')
    .select('code, role, max_uses, uses, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function createClubInvite(clubId: string, role: 'athlete' | 'coach', maxUses = 1): Promise<string> {
  const code = randomCode()
  const { error } = await supabase.from('club_invites').insert({ code, club_id: clubId, role, max_uses: maxUses })
  if (error) throw error
  return code
}
