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

export async function setAvailability(profileId: string, weekday: number, patch: Partial<Pick<DayAvailability, 'matin' | 'apres_midi'>>) {
  const { error } = await supabase
    .from('athlete_availabilities')
    .upsert({ profile_id: profileId, weekday, ...patch }, { onConflict: 'profile_id,weekday' })
  if (error) throw error
}
