import { supabase } from '../supabase'

export interface RaceAssignment {
  id: string
  profile_id: string
  discipline: string
  target_time: string | null
  profile: { name: string } | null
}

export type RaceType = 'piste' | 'route' | 'cross' | 'trail' | 'stage'
export const RACE_TYPE_LABEL: Record<RaceType, string> = { piste: 'Piste', route: 'Route', cross: 'Cross', trail: 'Trail', stage: 'Stage' }

export interface ClubRace {
  id: string
  title: string
  event_date: string
  location: string | null
  race_type: RaceType
  assignments: RaceAssignment[]
}

export async function fetchClubRaces(clubId: string): Promise<ClubRace[]> {
  const { data, error } = await supabase
    .from('club_races')
    .select('id, title, event_date, location, race_type, assignments:club_race_assignments(id, profile_id, discipline, target_time, profile:profiles(name))')
    .eq('club_id', clubId)
    .order('event_date', { ascending: true })
  if (error) throw error
  return data as unknown as ClubRace[]
}

export async function createClubRace(clubId: string, coachId: string, input: { title: string; event_date: string; location: string | null; race_type: RaceType }) {
  const { data, error } = await supabase.from('club_races').insert({ club_id: clubId, created_by: coachId, ...input }).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function deleteClubRace(id: string) {
  const { error } = await supabase.from('club_races').delete().eq('id', id)
  if (error) throw error
}

export async function assignAthleteToRace(raceId: string, profileId: string, discipline: string, targetTime: string | null) {
  const { error } = await supabase.from('club_race_assignments').insert({ race_id: raceId, profile_id: profileId, discipline, target_time: targetTime })
  if (error) throw error
}

export async function removeRaceAssignment(id: string) {
  const { error } = await supabase.from('club_race_assignments').delete().eq('id', id)
  if (error) throw error
}

/** Races the athlete is personally assigned to. */
export async function fetchAthleteRaces(profileId: string): Promise<(ClubRace & { myAssignment: RaceAssignment })[]> {
  const { data, error } = await supabase
    .from('club_race_assignments')
    .select('id, profile_id, discipline, target_time, race:club_races(id, title, event_date, location, race_type)')
    .eq('profile_id', profileId)
  if (error) throw error
  return (data as unknown as { id: string; profile_id: string; discipline: string; target_time: string | null; race: { id: string; title: string; event_date: string; location: string | null; race_type: RaceType } }[])
    .filter((row) => row.race)
    .map((row) => ({
      id: row.race.id, title: row.race.title, event_date: row.race.event_date, location: row.race.location, race_type: row.race.race_type,
      assignments: [],
      myAssignment: { id: row.id, profile_id: row.profile_id, discipline: row.discipline, target_time: row.target_time, profile: null },
    }))
}
