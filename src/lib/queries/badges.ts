import { supabase } from '../supabase'
import { fetchAthleteTotalKm, fetchWeeklyStreak, fetchGoodRecoveryDaysCount } from './stats'
import { fetchPersonalRecords } from './profileExtras'

export interface BadgeDef {
  id: string
  code: string
  title: string
  description: string
  icon_key: string
  criteria_kind: 'total_km' | 'streak_weeks' | 'records_count' | 'sessions_month' | 'recovery_days'
  criteria_value: number
}

export interface EarnedBadge {
  badge_id: string
  earned_at: string
}

export async function fetchBadgeDefinitions(): Promise<BadgeDef[]> {
  const { data, error } = await supabase.from('badges').select('id, code, title, description, icon_key, criteria_kind, criteria_value')
  if (error) throw error
  return data as BadgeDef[]
}

export async function fetchEarnedBadges(profileId: string): Promise<EarnedBadge[]> {
  const { data, error } = await supabase.from('athlete_badges').select('badge_id, earned_at').eq('profile_id', profileId)
  if (error) throw error
  return data
}

/** Checks real aggregates against badge criteria and awards any newly-met badge. */
export async function computeAndAwardBadges(profileId: string): Promise<void> {
  const [defs, earned, totalKm, streak, records, recoveryDays] = await Promise.all([
    fetchBadgeDefinitions(),
    fetchEarnedBadges(profileId),
    fetchAthleteTotalKm(profileId),
    fetchWeeklyStreak(profileId),
    fetchPersonalRecords(profileId),
    fetchGoodRecoveryDaysCount(profileId),
  ])
  const earnedIds = new Set(earned.map((e) => e.badge_id))
  const currentStreak = (() => {
    const idx = [...streak].reverse().findIndex((v) => !v)
    return idx === -1 ? streak.length : idx
  })()

  const toAward = defs.filter((b) => {
    if (earnedIds.has(b.id)) return false
    if (b.criteria_kind === 'total_km') return totalKm >= b.criteria_value
    if (b.criteria_kind === 'streak_weeks') return currentStreak >= b.criteria_value
    if (b.criteria_kind === 'records_count') return records.length >= b.criteria_value
    if (b.criteria_kind === 'recovery_days') return recoveryDays >= b.criteria_value
    return false
  })
  if (toAward.length === 0) return
  const { error } = await supabase.from('athlete_badges').insert(toAward.map((b) => ({ profile_id: profileId, badge_id: b.id })))
  if (error) throw error
}
