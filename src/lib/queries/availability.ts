import { supabase } from '../supabase'

export interface DayAvailability {
  weekday: number // 0 = Lundi .. 6 = Dimanche
  matin: boolean
  apres_midi: boolean
}

export const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export async function fetchAvailability(profileId: string): Promise<DayAvailability[]> {
  const { data, error } = await supabase
    .from('athlete_availabilities')
    .select('weekday, matin, apres_midi')
    .eq('profile_id', profileId)
    .order('weekday')
  if (error) throw error
  const byDay = new Map(data.map((d) => [d.weekday, d]))
  return Array.from({ length: 7 }, (_, weekday) => byDay.get(weekday) ?? { weekday, matin: true, apres_midi: true })
}

/** Bulk lookup for a roster view — one query instead of one per athlete. */
export async function fetchAvailabilityForProfiles(profileIds: string[]): Promise<Record<string, DayAvailability[]>> {
  if (profileIds.length === 0) return {}
  const { data, error } = await supabase
    .from('athlete_availabilities')
    .select('profile_id, weekday, matin, apres_midi')
    .in('profile_id', profileIds)
  if (error) throw error
  const byProfile = new Map<string, Map<number, DayAvailability>>()
  for (const row of data) {
    if (!byProfile.has(row.profile_id)) byProfile.set(row.profile_id, new Map())
    byProfile.get(row.profile_id)!.set(row.weekday, { weekday: row.weekday, matin: row.matin, apres_midi: row.apres_midi })
  }
  const result: Record<string, DayAvailability[]> = {}
  for (const id of profileIds) {
    const days = byProfile.get(id)
    result[id] = Array.from({ length: 7 }, (_, weekday) => days?.get(weekday) ?? { weekday, matin: true, apres_midi: true })
  }
  return result
}

export async function setAvailability(profileId: string, weekday: number, patch: Partial<Pick<DayAvailability, 'matin' | 'apres_midi'>>) {
  const { error } = await supabase
    .from('athlete_availabilities')
    .upsert({ profile_id: profileId, weekday, ...patch }, { onConflict: 'profile_id,weekday' })
  if (error) throw error
}
