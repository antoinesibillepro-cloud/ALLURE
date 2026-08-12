import { supabase } from '../supabase'

export interface StrengthMax {
  id: string
  exercise: string
  max_kg: number
}

export async function fetchStrengthMaxes(profileId: string): Promise<StrengthMax[]> {
  const { data, error } = await supabase
    .from('strength_maxes')
    .select('id, exercise, max_kg')
    .eq('profile_id', profileId)
    .order('exercise')
  if (error) throw error
  return data
}

export async function upsertStrengthMax(profileId: string, exercise: string, maxKg: number) {
  const { error } = await supabase
    .from('strength_maxes')
    .upsert({ profile_id: profileId, exercise, max_kg: maxKg, updated_at: new Date().toISOString() }, { onConflict: 'profile_id,exercise' })
  if (error) throw error
}

export async function deleteStrengthMax(id: string) {
  const { error } = await supabase.from('strength_maxes').delete().eq('id', id)
  if (error) throw error
}

/** Standard %1RM → reps chart (Epley-based), used to show target reps at each load. */
export const LOAD_PERCENT_TABLE = [
  { pct: 100, reps: 1 },
  { pct: 95, reps: 2 },
  { pct: 90, reps: 4 },
  { pct: 85, reps: 6 },
  { pct: 80, reps: 8 },
  { pct: 75, reps: 10 },
  { pct: 70, reps: 12 },
  { pct: 65, reps: 15 },
  { pct: 60, reps: 20 },
]
