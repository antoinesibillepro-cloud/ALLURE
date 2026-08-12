import { supabase } from '../supabase'

// ── Competitions & objectives ────────────────────────────────────────────
export interface Competition {
  id: string
  kind: 'competition' | 'objective'
  title: string
  event_date: string | null
  distance_km: number | null
  target_time: string | null
  done: boolean
}

export async function fetchCompetitions(profileId: string): Promise<Competition[]> {
  const { data, error } = await supabase
    .from('competitions')
    .select('id, kind, title, event_date, distance_km, target_time, done')
    .eq('profile_id', profileId)
    .order('event_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data
}

export async function createCompetition(profileId: string, input: Omit<Competition, 'id' | 'done'>) {
  const { error } = await supabase.from('competitions').insert({ profile_id: profileId, ...input })
  if (error) throw error
}

export async function toggleCompetitionDone(id: string, done: boolean) {
  const { error } = await supabase.from('competitions').update({ done }).eq('id', id)
  if (error) throw error
}

export async function deleteCompetition(id: string) {
  const { error } = await supabase.from('competitions').delete().eq('id', id)
  if (error) throw error
}

export async function fetchNextCompetition(profileId: string) {
  const { data, error } = await supabase
    .from('competitions')
    .select('id, title, event_date, distance_km, target_time')
    .eq('profile_id', profileId)
    .eq('kind', 'competition')
    .eq('done', false)
    .gte('event_date', new Date().toISOString().slice(0, 10))
    .order('event_date', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Weight logs ───────────────────────────────────────────────────────────
export interface WeightLog { date: string; weight_kg: number }

export async function fetchWeightLogs(profileId: string, limit = 10): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('date, weight_kg')
    .eq('profile_id', profileId)
    .order('date', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data
}

export async function saveWeightLog(profileId: string, date: string, weightKg: number) {
  const { error } = await supabase.from('weight_logs').upsert({ profile_id: profileId, date, weight_kg: weightKg })
  if (error) throw error
}

// ── Personal records ─────────────────────────────────────────────────────
export interface PersonalRecord { id: string; discipline: string; value: string; date: string; is_season_best: boolean }

export async function fetchPersonalRecords(profileId: string): Promise<PersonalRecord[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('id, discipline, value, date, is_season_best')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createPersonalRecord(profileId: string, discipline: string, value: string, date: string) {
  const { error } = await supabase.from('personal_records').insert({ profile_id: profileId, discipline, value, date })
  if (error) throw error
}

export async function updatePersonalRecord(id: string, fields: Partial<Pick<PersonalRecord, 'discipline' | 'value' | 'is_season_best'>>) {
  const { error } = await supabase.from('personal_records').update(fields).eq('id', id)
  if (error) throw error
}

export async function deletePersonalRecord(id: string) {
  const { error } = await supabase.from('personal_records').delete().eq('id', id)
  if (error) throw error
}

// ── Injuries ──────────────────────────────────────────────────────────────
export interface Injury { id: string; type: string; date: string; duration_text: string | null; severity: 'légère' | 'modérée' | 'grave' }

export async function fetchInjuries(profileId: string): Promise<Injury[]> {
  const { data, error } = await supabase
    .from('injuries')
    .select('id, type, date, duration_text, severity')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createInjury(profileId: string, input: Omit<Injury, 'id'>) {
  const { error } = await supabase.from('injuries').insert({ profile_id: profileId, ...input })
  if (error) throw error
}

// ── Groups the athlete belongs to ────────────────────────────────────────
export async function fetchMyGroups(profileId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(id, name)')
    .eq('profile_id', profileId)
  if (error) throw error
  return (data ?? []).map((r: unknown) => (r as { groups: { id: string; name: string } }).groups).filter(Boolean)
}

export async function fetchClubName(clubId: string) {
  const { data, error } = await supabase.from('clubs').select('name').eq('id', clubId).maybeSingle()
  if (error) throw error
  return data?.name ?? ''
}

// ── Referent coach (the primary coach, falling back to the earliest coach of the club) ──
export async function fetchReferentCoach(clubId: string) {
  const { data: primary, error: primaryErr } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('club_id', clubId)
    .eq('role', 'coach')
    .eq('is_primary_coach', true)
    .limit(1)
    .maybeSingle()
  if (primaryErr) throw primaryErr
  if (primary) return primary

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('club_id', clubId)
    .eq('role', 'coach')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Notification prefs ───────────────────────────────────────────────────
export interface NotificationPrefs { messages: boolean; sessions: boolean; reminders: boolean; competitions: boolean }

export async function uploadAvatar(profileId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${profileId}/avatar.${ext}`
  const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadErr) throw uploadErr
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profileId)
  if (error) throw error
  return url
}

export async function updateVma(profileId: string, vma: number) {
  const { error } = await supabase.from('profiles').update({ vma }).eq('id', profileId)
  if (error) throw error
}

export async function saveNotificationPrefs(profileId: string, prefs: NotificationPrefs) {
  const { error } = await supabase.from('profiles').update({ notification_prefs: { ...prefs } }).eq('id', profileId)
  if (error) throw error
}
