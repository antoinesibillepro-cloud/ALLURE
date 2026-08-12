import { supabase } from '../supabase'

export interface ClubMember {
  id: string
  name: string
  email: string
  role: 'athlete' | 'coach'
  vma: number | null
  created_at: string
  group_id: string | null
  group_name: string | null
}

export async function fetchClubMembers(clubId: string): Promise<ClubMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, vma, created_at, group_members(group_id, groups(name))')
    .eq('club_id', clubId)
    .order('role', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map((p: unknown) => {
    const row = p as { id: string; name: string; email: string; role: 'athlete' | 'coach'; vma: number | null; created_at: string; group_members: { group_id: string; groups: { name: string } | null }[] }
    const g = row.group_members?.[0]
    return { id: row.id, name: row.name, email: row.email, role: row.role, vma: row.vma, created_at: row.created_at, group_id: g?.group_id ?? null, group_name: g?.groups?.name ?? null }
  })
}

export async function updateMemberRole(profileId: string, role: 'athlete' | 'coach') {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
  if (error) throw error
}

export async function updateMemberName(profileId: string, name: string) {
  const { error } = await supabase.from('profiles').update({ name }).eq('id', profileId)
  if (error) throw error
}

export async function updateMemberVma(profileId: string, vma: number | null) {
  const { error } = await supabase.from('profiles').update({ vma }).eq('id', profileId)
  if (error) throw error
}

export async function updateMemberGroup(profileId: string, groupId: string | null) {
  const { error: delErr } = await supabase.from('group_members').delete().eq('profile_id', profileId)
  if (delErr) throw delErr
  if (groupId) {
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, profile_id: profileId })
    if (error) throw error
  }
}

export async function removeMember(profileId: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', profileId)
  if (error) throw error
}

/** Generates a new password for the member and emails it to them via Resend. */
export async function resetPasswordEmail(profileId: string) {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) throw new Error('Non authentifié')
  const res = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ profileId }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? "Échec de la réinitialisation")
  const result = await res.json() as { ok: boolean; emailError?: string }
  if (result.emailError) throw new Error(result.emailError)
}

export async function createAccountViaAdmin(input: { email: string; password: string; name: string; role: 'athlete' | 'coach'; groupId: string | null; sendWelcomeEmail?: boolean }) {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) throw new Error('Non authentifié')
  const res = await fetch('/api/admin/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'Échec de la création du compte')
  return res.json() as Promise<{ id: string; emailError: string | null }>
}

export async function sendMemberEmail(to: string, subject: string, message: string) {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) throw new Error('Non authentifié')
  const res = await fetch('/api/admin/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, subject, message }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? "Échec de l'envoi")
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
