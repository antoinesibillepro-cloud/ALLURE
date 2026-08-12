import { supabase } from '../supabase'

export interface DailyCheckin {
  sleep: number
  fatigue: number
  stress: number
  soreness: number
  motivation: number
}

export async function fetchTodayCheckin(profileId: string, date: string) {
  const { data, error } = await supabase
    .from('daily_checkins')
    .select('sleep, fatigue, stress, soreness, motivation')
    .eq('profile_id', profileId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw error
  return data as DailyCheckin | null
}

export async function saveCheckin(profileId: string, date: string, values: DailyCheckin) {
  const { error } = await supabase.from('daily_checkins').upsert({ profile_id: profileId, date, ...values })
  if (error) throw error
}

export async function fetchAthleteLatestCheckin(profileId: string) {
  const { data, error } = await supabase
    .from('daily_checkins')
    .select('date, sleep, fatigue, stress, soreness, motivation')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
