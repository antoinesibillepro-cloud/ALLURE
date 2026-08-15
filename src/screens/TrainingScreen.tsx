import { useState } from 'react'
import { Card, SectionLabel } from '../components/ui'
import AddSessionSheet, { type SessionData } from '../components/AddSessionSheet'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchAthleteSessions, validateSession, logFreeSession, type AthleteSession } from '../lib/queries/sessions'
import { fetchStravaStatus, connectStrava, syncStrava, fetchStravaActivities, fetchLinkedStravaActivityIds, type StravaActivity } from '../lib/queries/strava'
import { fetchCompetitions, createCompetition, toggleCompetitionDone, deleteCompetition, updateVma, type Competition } from '../lib/queries/profileExtras'
import { fetchCrossTrainingLogs, createCrossTrainingLog, updateCrossTrainingLog, deleteCrossTrainingLog, fetchWeeklyDisciplineKm, type CrossTrainingLog, type Discipline } from '../lib/queries/crossTraining'
import { fetchAthleteRaces, type ClubRace, type RaceAssignment } from '../lib/queries/clubRaces'
import { fetchStrengthMaxes, upsertStrengthMax, deleteStrengthMax, LOAD_PERCENT_TABLE, type StrengthMax } from '../lib/queries/strength'
import { AreaTrendChart } from '../components/charts'
import BodyDiagram from '../components/BodyDiagram'
import AthleteDesktopSidebar from '../components/AthleteDesktopSidebar'
import { useToast } from '../components/Toast'

// ── helpers ──────────────────────────────────────────────────────────────────
function paceStr(kmh: number): string {
  const s = 3600 / kmh
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}'${sec.toString().padStart(2, '0')}"`
}
function splitStr(kmh: number, m: number): string {
  const sec = (m / 1000) * (3600 / kmh)
  if (sec < 60) return `${Math.round(sec)}"`
  const min = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${min}'${s.toString().padStart(2, '0')}"`
}
// Accepts "4:00", "4'00", "4'00\"", "1:04:00" (h:mm:ss) or a raw seconds number like "240".
function parseTimeToSeconds(input: string): number | null {
  const cleaned = input.trim().replace(/["']/g, ':').replace(/:+/g, ':').replace(/:$/, '')
  if (!cleaned) return null
  const parts = cleaned.split(':').filter(Boolean)
  const nums = parts.map((p) => parseFloat(p.replace(',', '.')))
  if (!nums.length || nums.some((n) => !Number.isFinite(n))) return null
  if (nums.length === 1) return nums[0]
  if (nums.length === 2) return nums[0] * 60 + nums[1]
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2]
  return null
}

function formatClock(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}"`
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds - h * 3600 - m * 60
  const sStr = s.toFixed(1).padStart(4, '0')
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}'${sStr}"`
  return `${m}'${sStr}"`
}

const SPLIT_MARKS = [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1600, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000, 21097, 25000, 30000, 35000, 40000, 42195]

function distanceLabel(m: number): string {
  if (m % 1000 === 0) return `${m / 1000} km`
  if (m >= 1000) return `${(m / 1000).toFixed(3).replace(/\.?0+$/, '')} km`
  return `${m} m`
}

// ── data ─────────────────────────────────────────────────────────────────────
type Chip = { id: string; label: string; done: boolean; description: string | null; sessionId: string | null; source: 'session' | 'strava' }

const VMA_ZONES = [
  { pct: 60, label: 'Footing très cool' },
  { pct: 65, label: 'Footing cool' },
  { pct: 70, label: 'Endurance' },
  { pct: 75, label: 'Endurance active' },
  { pct: 80, label: 'Seuil 1' },
  { pct: 85, label: 'Seuil 2' },
  { pct: 90, label: 'VMA longue' },
  { pct: 95, label: 'VMA moyenne' },
  { pct: 100, label: 'VMA (100%)' },
]

// ── main component ────────────────────────────────────────────────────────────
const MONTH_LABEL = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
const startOffset = (monthStart.getDay() + 6) % 7 // Monday = 0

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

export default function TrainingScreen() {
  const { profile } = useApp()
  const toast = useToast()
  const [selectedDay, setSelectedDay] = useState(now.getDate())
  const [perfTab, setPerfTab] = useState<'allures' | 'musculation'>('allures')
  const [compTab, setCompTab] = useState<'comp' | 'obj'>('comp')
  const [vma, setVma] = useState(profile?.vma ?? 16)
  const [showAddSession, setShowAddSession] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showAddComp, setShowAddComp] = useState(false)
  const [newCompTitle, setNewCompTitle] = useState('')
  const [newCompDate, setNewCompDate] = useState('')
  const [newCompDistance, setNewCompDistance] = useState('')
  const [newCompTarget, setNewCompTarget] = useState('')
  const [savingComp, setSavingComp] = useState(false)
  const [crossTab, setCrossTab] = useState<Discipline>('velo')
  const [showAddCross, setShowAddCross] = useState(false)
  const [editingCrossId, setEditingCrossId] = useState<string | null>(null)
  const [newCrossDate, setNewCrossDate] = useState(isoDate(now))
  const [newCrossTimeSlot, setNewCrossTimeSlot] = useState<'matin' | 'apres-midi' | ''>('')
  const [newCrossDuration, setNewCrossDuration] = useState('')
  const [newCrossDistance, setNewCrossDistance] = useState('')
  const [newCrossAvgSpeed, setNewCrossAvgSpeed] = useState('')
  const [newCrossNotes, setNewCrossNotes] = useState('')
  const [newCrossZones, setNewCrossZones] = useState<string[]>([])
  const [savingCross, setSavingCross] = useState(false)

  const { data: strengthMaxes, refetch: refetchMaxes } = useQuery<StrengthMax[]>(
    () => (profile ? fetchStrengthMaxes(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const [newExercise, setNewExercise] = useState('')
  const [newMax, setNewMax] = useState('')
  const [muscuPct, setMuscuPct] = useState(80)
  const [calcDistance, setCalcDistance] = useState('1500')
  const [calcTime, setCalcTime] = useState('4:00')

  const { data: competitions, refetch: refetchCompetitions } = useQuery<Competition[]>(
    () => (profile ? fetchCompetitions(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: clubRaces } = useQuery<(ClubRace & { myAssignment: RaceAssignment })[]>(
    () => (profile ? fetchAthleteRaces(profile.id) : Promise.resolve([])),
    [profile?.id],
  )

  const { data: crossLogs, refetch: refetchCrossLogs } = useQuery<CrossTrainingLog[]>(
    () => (profile ? fetchCrossTrainingLogs(profile.id, crossTab) : Promise.resolve([])),
    [profile?.id, crossTab],
  )
  const { data: crossTrend } = useQuery<{ label: string; km: number }[]>(
    () => (profile && crossTab !== 'gainage' ? fetchWeeklyDisciplineKm(profile.id, crossTab) : Promise.resolve([])),
    [profile?.id, crossTab],
  )
  const { data: muscLogs, refetch: refetchMuscLogs } = useQuery<CrossTrainingLog[]>(
    () => (profile ? fetchCrossTrainingLogs(profile.id, 'musculation') : Promise.resolve([])),
    [profile?.id],
  )

  function resetCrossForm() {
    setNewCrossDate(isoDate(now)); setNewCrossTimeSlot(''); setNewCrossDuration(''); setNewCrossDistance('')
    setNewCrossAvgSpeed(''); setNewCrossNotes(''); setNewCrossZones([]); setEditingCrossId(null)
  }

  async function handleAddCross(discipline: Discipline, refetch: () => void) {
    if (!profile || !newCrossDuration.trim()) return
    setSavingCross(true)
    try {
      const payload = {
        discipline,
        date: newCrossDate,
        time_slot: newCrossTimeSlot || null,
        duration_min: parseInt(newCrossDuration, 10),
        distance_km: newCrossDistance ? parseFloat(newCrossDistance) : null,
        avg_speed_kmh: newCrossAvgSpeed ? parseFloat(newCrossAvgSpeed) : null,
        rpe: null,
        notes: newCrossNotes || null,
        muscle_zones: newCrossZones,
      }
      if (editingCrossId) {
        await updateCrossTrainingLog(editingCrossId, payload)
      } else {
        await createCrossTrainingLog(profile.id, payload)
      }
      resetCrossForm()
      setShowAddCross(false)
      refetch()
    } finally {
      setSavingCross(false)
    }
  }

  function handleEditCross(log: CrossTrainingLog) {
    setEditingCrossId(log.id)
    setNewCrossDate(log.date)
    setNewCrossTimeSlot(log.time_slot ?? '')
    setNewCrossDuration(String(log.duration_min))
    setNewCrossDistance(log.distance_km !== null ? String(log.distance_km) : '')
    setNewCrossAvgSpeed(log.avg_speed_kmh !== null ? String(log.avg_speed_kmh) : '')
    setNewCrossNotes(log.notes ?? '')
    setNewCrossZones(log.muscle_zones ?? [])
    setShowAddCross(true)
  }

  async function handleDeleteCross(id: string, refetch: () => void) {
    await deleteCrossTrainingLog(id)
    refetch()
  }

  async function handleSaveMax() {
    if (!profile || !newExercise.trim() || !newMax) return
    await upsertStrengthMax(profile.id, newExercise.trim(), parseFloat(newMax))
    setNewExercise(''); setNewMax('')
    await refetchMaxes()
  }

  async function handleDeleteMax(id: string) {
    await deleteStrengthMax(id)
    await refetchMaxes()
  }

  async function handleUpdateMax(exercise: string, maxKg: number) {
    if (!profile || !Number.isFinite(maxKg) || maxKg <= 0) return
    await upsertStrengthMax(profile.id, exercise, maxKg)
    await refetchMaxes()
  }

  function handleVmaChange(next: number) {
    setVma(next)
    if (profile) updateVma(profile.id, next)
  }

  async function handleAddCompetition(kind: 'competition' | 'objective') {
    if (!profile || !newCompTitle.trim()) return
    setSavingComp(true)
    try {
      await createCompetition(profile.id, {
        kind,
        title: newCompTitle.trim(),
        event_date: newCompDate || null,
        distance_km: newCompDistance ? parseFloat(newCompDistance) : null,
        target_time: newCompTarget || null,
      })
      setNewCompTitle(''); setNewCompDate(''); setNewCompDistance(''); setNewCompTarget('')
      setShowAddComp(false)
      await refetchCompetitions()
    } finally {
      setSavingComp(false)
    }
  }

  async function handleDeleteCompetition(id: string) {
    await deleteCompetition(id)
    await refetchCompetitions()
  }

  async function handleToggleObjective(id: string, done: boolean) {
    await toggleCompetitionDone(id, done)
    await refetchCompetitions()
  }

  const { data: stravaStatus, refetch: refetchStravaStatus } = useQuery(() => fetchStravaStatus(), [])
  const { data: stravaActivities, refetch: refetchStravaActivities } = useQuery<StravaActivity[]>(
    () => (profile ? fetchStravaActivities(profile.id, 60) : Promise.resolve([])),
    [profile?.id],
  )
  // Activities auto-linked to a coach-planned session (a sync means it was, in
  // principle, actually done) — excluded below from the calendar so the same
  // workout doesn't show up twice.
  const { data: linkedStravaIds, refetch: refetchLinkedIds } = useQuery<Set<string>>(
    () => (profile ? fetchLinkedStravaActivityIds(profile.id) : Promise.resolve(new Set<string>())),
    [profile?.id],
  )
  const stravaWeek = (stravaActivities ?? []).filter((a) => {
    const d = new Date(a.start_date).getTime()
    return d >= now.getTime() - 7 * 86400000
  })
  const stravaWeekKm = stravaWeek.reduce((sum, a) => sum + a.distance_m / 1000, 0)

  const STRAVA_TYPE_BY_DISCIPLINE: Record<string, string[]> = { velo: ['Ride', 'VirtualRide'], natation: ['Swim'] }
  const stravaCrossActivities = (stravaActivities ?? []).filter((a) => STRAVA_TYPE_BY_DISCIPLINE[crossTab]?.includes(a.type))
  const stravaCrossKm = stravaCrossActivities.reduce((s, a) => s + a.distance_m / 1000, 0)
  const stravaCrossMin = stravaCrossActivities.reduce((s, a) => s + a.moving_time_s / 60, 0)

  const dayIdx0 = (now.getDay() + 6) % 7
  const trendWeekStart = new Date(now); trendWeekStart.setHours(0, 0, 0, 0); trendWeekStart.setDate(trendWeekStart.getDate() - dayIdx0)
  const crossTrendMerged = (crossTrend ?? []).map((t, i) => {
    const wStart = new Date(trendWeekStart.getTime() - (7 - 1 - i) * 7 * 86400000)
    const wEnd = new Date(wStart.getTime() + 7 * 86400000)
    const stravaKm = stravaCrossActivities
      .filter((a) => { const d = new Date(a.start_date).getTime(); return d >= wStart.getTime() && d < wEnd.getTime() })
      .reduce((s, a) => s + a.distance_m / 1000, 0)
    return { label: t.label, km: t.km + stravaKm }
  })

  async function handleStravaButton() {
    if (!stravaStatus?.connected) {
      try {
        await connectStrava()
      } catch {
        toast('Session expirée, recharge la page puis réessaie', 'error')
      }
      return
    }
    setSyncing(true)
    try {
      await syncStrava()
      await Promise.all([refetchStravaActivities(), refetchStravaStatus(), refetchLinkedIds(), refetchMonth()])
      toast('Strava synchronisé')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Synchronisation impossible', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const { data: monthSessions, refetch: refetchMonth } = useQuery<AthleteSession[]>(
    () => (profile ? fetchAthleteSessions(profile.id, isoDate(monthStart), isoDate(monthEnd)) : Promise.resolve([])),
    [profile?.id, MONTH_LABEL],
  )

  const dayChips: Record<number, Chip[]> = {}
  for (const s of monthSessions ?? []) {
    const day = new Date(s.scheduled_at).getDate()
    dayChips[day] = dayChips[day] ?? []
    dayChips[day].push({ id: s.id, label: s.title, done: s.completion?.status === 'done', description: s.description, sessionId: s.id, source: 'session' })
  }
  for (const a of stravaActivities ?? []) {
    if (linkedStravaIds?.has(a.id)) continue // already represented by its matched session chip
    const d = new Date(a.start_date)
    if (d < monthStart || d >= monthEnd) continue
    const day = d.getDate()
    dayChips[day] = dayChips[day] ?? []
    dayChips[day].push({
      id: `strava-${a.id}`,
      label: `${a.name} · ${(a.distance_m / 1000).toFixed(1)}km`,
      done: true,
      description: `${a.type} · ${Math.round(a.moving_time_s / 60)} min (Strava)`,
      sessionId: null,
      source: 'strava',
    })
  }

  async function handleValidate(sessionId: string) {
    if (!profile) return
    setValidatingId(sessionId)
    try {
      await validateSession(sessionId, profile.id, 6, '')
      await refetchMonth()
    } finally {
      setValidatingId(null)
    }
  }

  async function handleLogFreeSession(data: SessionData) {
    if (!profile) return
    await logFreeSession(profile.id, data.title, data.distance ?? 0, data.duration)
    await refetchMonth()
  }

  const cells: Array<number | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const sectionA = (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Entraînements</h1>
        <button onClick={handleStravaButton} disabled={syncing}
          className="flex items-center gap-2 text-white text-xs font-bold px-3.5 py-2 rounded-2xl disabled:opacity-60"
          style={{ background: '#FC5200' }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.5 4.5H11L8 6.5L9.5 10.5L6 8L2.5 10.5L4 6.5L1 4.5H4.5L6 1Z" fill="white" />
          </svg>
          {!stravaStatus?.connected ? 'Connecter Strava' : syncing ? 'Synchronisation…' : 'Synchroniser →'}
        </button>
      </div>

      {stravaStatus?.connected && (
        <Card className="!p-4" style={{ background: 'linear-gradient(135deg, rgba(252,82,0,0.10) 0%, rgba(252,82,0,0.02) 60%, transparent 100%)', border: '1px solid rgba(252,82,0,0.18)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L7.5 4.5H11L8 6.5L9.5 10.5L6 8L2.5 10.5L4 6.5L1 4.5H4.5L6 1Z" fill="#FC5200" />
              </svg>
              <SectionLabel>Aperçu Strava</SectionLabel>
            </div>
            {!!stravaActivities?.length && (
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{stravaActivities.length} activités synchronisées</span>
            )}
          </div>

          {!stravaActivities?.length ? (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucune activité synchronisée pour l'instant — clique sur Synchroniser.</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-3 pb-3" style={{ borderBottom: '1px solid rgba(252,82,0,0.15)' }}>
                <div>
                  <p className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>{stravaWeekKm.toFixed(1)}<span className="text-sm font-semibold ml-1" style={{ color: 'var(--text-2)' }}>km</span></p>
                  <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-2)' }}>7 derniers jours</p>
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>{stravaWeek.length}</p>
                  <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-2)' }}>séances Strava</p>
                </div>
              </div>
              <div className="space-y-2">
                {stravaActivities.slice(0, 4).map((a) => {
                  const linked = linkedStravaIds?.has(a.id)
                  const paceStr = a.average_speed_ms
                    ? (() => {
                        const secPerKm = 1000 / a.average_speed_ms
                        const m = Math.floor(secPerKm / 60)
                        const s = Math.round(secPerKm % 60)
                        return `${m}'${s.toString().padStart(2, '0')}"/km`
                      })()
                    : null
                  return (
                    <div key={a.id} className="py-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                          {linked && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(94,186,101,0.15)', color: '#5EBA65' }}>
                              liée à une séance
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold shrink-0 ml-2" style={{ color: 'var(--text-1)' }}>
                          {(a.distance_m / 1000).toFixed(1)} km · {Math.round(a.moving_time_s / 60)} min
                        </p>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                        {new Date(a.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {a.type}
                        {paceStr ? ` · ${paceStr}` : ''}
                        {a.total_elevation_gain_m ? ` · D+ ${Math.round(a.total_elevation_gain_m)}m` : ''}
                        {a.average_heartrate ? ` · ${Math.round(a.average_heartrate)} bpm moy.` : ''}
                        {a.max_heartrate ? ` (max ${Math.round(a.max_heartrate)})` : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Calendar ── */}
      <Card className="!p-4">
        <div className="flex items-center justify-between mb-4">
          <button className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <p className="font-bold text-sm capitalize" style={{ color: 'var(--text-1)' }}>{MONTH_LABEL}</p>
          <button className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['LU', 'MA', 'ME', 'JE', 'VE', 'SA', 'DI'].map((d, i) => (
            <div key={i} className="text-center text-[9px] font-bold tracking-widest py-0.5" style={{ color: 'var(--text-2)' }}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />
            const chips = dayChips[day] ?? []
            const isSelected = day === selectedDay
            const isToday = day === now.getDate()
            const hasDone = chips.some(c => c.done)
            return (
              <button key={day} onClick={() => setSelectedDay(day)}
                className="relative flex flex-col items-start p-0.5 rounded-lg transition-all min-h-[56px]"
                style={{
                  background: isSelected ? 'rgba(242,196,0,0.15)' : 'transparent',
                  outline: isSelected ? '1.5px solid #F2C400' : isToday ? '1px solid rgba(242,196,0,0.3)' : 'none',
                  outlineOffset: '0px',
                }}>
                <div className="flex items-center gap-0.5 px-0.5 pt-0.5 w-full">
                  <span className="text-[11px] font-semibold" style={{ color: isSelected ? '#F2C400' : 'var(--text-1)' }}>{day}</span>
                  {hasDone && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="ml-auto">
                      <path d="M2 5L4 7.5L8 3" stroke="#5EBA65" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="w-full space-y-0.5 px-0.5 pb-0.5">
                  {chips.slice(0, 3).map((c, ci) => (
                    <div key={ci} className="rounded px-1 text-[7.5px] font-semibold truncate leading-[14px]"
                      style={{
                        background: c.source === 'strava' ? 'rgba(252,82,0,0.16)' : c.done ? 'rgba(94,186,101,0.18)' : 'rgba(242,196,0,0.18)',
                        color: c.source === 'strava' ? '#FC5200' : c.done ? '#5EBA65' : '#D4AB00',
                      }}>
                      {c.label}
                    </div>
                  ))}
                  {chips.length > 3 && (
                    <div className="text-[7px] font-bold px-1" style={{ color: 'var(--text-2)' }}>+{chips.length - 3}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-1" style={{ borderTop: '1px solid var(--border)' }}>
          {[{ val: String(Object.values(dayChips).flat().length), label: 'séances ce mois' }].map(s => (
            <span key={s.label} className="text-xs" style={{ color: 'var(--text-2)' }}>
              <span className="font-black text-sm mr-0.5" style={{ color: 'var(--text-1)' }}>{s.val}</span>{s.label}
            </span>
          ))}
        </div>
      </Card>

      {/* ── Selected day ── */}
      <Card>
        <p className="text-xs font-bold mb-2 capitalize" style={{ color: 'var(--text-2)' }}>
          {new Date(now.getFullYear(), now.getMonth(), selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {dayChips[selectedDay]?.length ? (
          <div className="space-y-2">
            {dayChips[selectedDay].map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                style={{ background: 'var(--surface2)' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.source === 'strava' ? '#FC5200' : c.done ? '#5EBA65' : '#F2C400' }} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium block truncate" style={{ color: 'var(--text-1)' }}>{c.label}</span>
                    {c.description && <span className="text-xs block truncate" style={{ color: 'var(--text-2)' }}>{c.description}</span>}
                  </div>
                </div>
                {c.source === 'strava' ? (
                  <span className="text-xs font-semibold shrink-0" style={{ color: '#FC5200' }}>Strava</span>
                ) : c.done ? (
                  <span className="text-xs font-semibold text-[#5EBA65] shrink-0">Réalisée</span>
                ) : (
                  <button disabled={validatingId === c.sessionId} onClick={() => c.sessionId && handleValidate(c.sessionId)}
                    className="text-xs font-bold px-3 py-1 rounded-full text-[#0E0E0D] disabled:opacity-50 shrink-0" style={{ background: '#F2C400' }}>
                    {validatingId === c.sessionId ? '…' : 'Valider'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucune séance ce jour.</p>
            <button onClick={() => setShowAddSession(true)}
              className="mt-3 w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ border: '1px dashed var(--border)', color: 'var(--text-2)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Ajouter une séance ce jour-là
            </button>
          </>
        )}
      </Card>
    </>
  )

  const objectifsSection = (
    <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="#F2C400" />
          </svg>
          <SectionLabel>Objectifs & Compétitions</SectionLabel>
        </div>
        <Card>
          <div className="flex gap-1 mb-4 p-0.5 rounded-2xl w-fit" style={{ background: 'var(--surface2)' }}>
            {([
              { id: 'comp' as const, label: 'Compétitions', count: competitions?.filter((c) => c.kind === 'competition').length ?? 0 },
              { id: 'obj' as const,  label: 'Objectifs', count: competitions?.filter((c) => c.kind === 'objective').length ?? 0 },
            ]).map(t => (
              <button key={t.id} onClick={() => setCompTab(t.id)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: compTab === t.id ? 'var(--card)' : 'transparent',
                  color: compTab === t.id ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow: compTab === t.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}>
                {t.label} {t.count > 0 && <span className="opacity-60">({t.count})</span>}
              </button>
            ))}
          </div>

          {showAddComp && (
            <div className="mb-4 p-4 rounded-2xl space-y-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Titre</label>
                <input value={newCompTitle} onChange={(e) => setNewCompTitle(e.target.value)}
                  placeholder={compTab === 'comp' ? 'Ex: 10km de Paris' : 'Ex: Passer sous 40min au 10km'}
                  className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-widest font-bold mb-1 block" style={{ color: 'var(--text-2)' }}>Date</label>
                  <input type="date" value={newCompDate} onChange={(e) => setNewCompDate(e.target.value)}
                    className="w-full rounded-[10px] px-2 py-2 text-xs outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest font-bold mb-1 block" style={{ color: 'var(--text-2)' }}>Distance</label>
                  <input value={newCompDistance} onChange={(e) => setNewCompDistance(e.target.value)} placeholder="km"
                    className="w-full rounded-[10px] px-2 py-2 text-xs outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest font-bold mb-1 block" style={{ color: 'var(--text-2)' }}>Chrono cible</label>
                  <input value={newCompTarget} onChange={(e) => setNewCompTarget(e.target.value)} placeholder="ex: 45:00"
                    className="w-full rounded-[10px] px-2 py-2 text-xs outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleAddCompetition(compTab === 'comp' ? 'competition' : 'objective')}
                  disabled={savingComp || !newCompTitle.trim()}
                  className="text-xs font-bold px-4 py-2 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                  {savingComp ? '…' : 'Ajouter'}
                </button>
                <button onClick={() => setShowAddComp(false)} className="text-xs font-semibold px-4 py-2 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
              </div>
            </div>
          )}

          {compTab === 'comp' ? (
            <>
              {!!clubRaces?.length && (
                <div className="mb-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Assigné par le coach</p>
                  {clubRaces.map((r) => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(r.event_date).getTime() - now.getTime()) / 86400000))
                    return (
                      <div key={r.myAssignment.id} className="flex items-center gap-3 py-3 px-3 rounded-2xl" style={{ background: 'rgba(91,145,216,0.08)', border: '1px solid rgba(91,145,216,0.18)' }}>
                        <div className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'rgba(91,145,216,0.15)' }}>
                          <span className="text-sm font-black text-[#5B91D8] leading-none">{daysLeft}</span>
                          <span className="text-[7px] font-bold uppercase tracking-wider text-[#5B91D8] mt-0.5">jours</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-1)' }}>{r.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                            {new Date(r.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                            {r.location ? ` · ${r.location}` : ''} · {r.myAssignment.discipline}
                            {r.myAssignment.target_time ? ` · Objectif ${r.myAssignment.target_time}` : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {competitions?.filter((c) => c.kind === 'competition').length === 0 && !showAddComp && (
                <div className="flex flex-col items-center py-6 gap-2">
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" stroke="var(--text-2)" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucune compétition programmée.</p>
                </div>
              )}
              {competitions?.filter((c) => c.kind === 'competition').map((c) => {
                const daysLeft = c.event_date ? Math.max(0, Math.ceil((new Date(c.event_date).getTime() - now.getTime()) / 86400000)) : null
                return (
                  <div key={c.id} className="flex items-center gap-3 py-3.5 px-3 mb-2 last:mb-0 rounded-2xl"
                    style={{ background: 'var(--surface2)', borderLeft: '3px solid #F2C400' }}>
                    <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: 'rgba(242,196,0,0.12)' }}>
                      <span className="text-sm font-black text-[#F2C400] leading-none">{daysLeft !== null ? daysLeft : '—'}</span>
                      <span className="text-[7px] font-bold uppercase tracking-wider text-[#F2C400] mt-0.5">jours</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-1)' }}>{c.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                        {c.event_date ? new Date(c.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                        {c.distance_km ? ` · ${c.distance_km} km` : ''}{c.target_time ? ` · Objectif ${c.target_time}` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCompetition(c.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{ color: 'var(--text-2)' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                )
              })}
              <button onClick={() => setShowAddComp(true)} className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold text-[#F2C400] flex items-center justify-center gap-1.5"
                style={{ border: '1px dashed rgba(242,196,0,0.35)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Ajouter une compétition
              </button>
            </>
          ) : (
            <>
              {competitions?.filter((c) => c.kind === 'objective').length === 0 && !showAddComp && (
                <div className="flex flex-col items-center py-6 gap-2">
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7" stroke="var(--text-2)" strokeWidth="1.3" />
                    <circle cx="10" cy="10" r="3.5" stroke="var(--text-2)" strokeWidth="1.3" />
                  </svg>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucun objectif pour l'instant.</p>
                </div>
              )}
              {competitions?.filter((c) => c.kind === 'objective').map((obj) => (
                <div key={obj.id} className="flex items-start gap-3 py-3 px-3 mb-2 last:mb-0 rounded-2xl" style={{ background: 'var(--surface2)' }}>
                  <button onClick={() => handleToggleObjective(obj.id, !obj.done)}
                    className="w-6 h-6 rounded-full mt-0.5 flex items-center justify-center shrink-0 transition-all"
                    style={{ background: obj.done ? '#5EBA65' : 'transparent', border: `1.5px solid ${obj.done ? '#5EBA65' : 'var(--border)'}` }}>
                    {obj.done && <svg width="9" height="7" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#0E0E0D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: obj.done ? 'var(--text-2)' : 'var(--text-1)', textDecoration: obj.done ? 'line-through' : 'none' }}>{obj.title}</p>
                    {obj.event_date && <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Échéance : {new Date(obj.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>}
                  </div>
                  <button onClick={() => handleDeleteCompetition(obj.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ color: 'var(--text-2)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={() => setShowAddComp(true)} className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold text-[#F2C400] flex items-center justify-center gap-1.5"
                style={{ border: '1px dashed rgba(242,196,0,0.35)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Ajouter un objectif
              </button>
            </>
          )}
        </Card>
      </div>
  )

  const sectionB = (
    <>
      {/* ── Croisé ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 1.5L3.5 7.5H7L5.5 12.5L11 6.5H7.5L8.5 1.5Z" fill="#F2C400" />
          </svg>
          <SectionLabel>Croisé</SectionLabel>
        </div>
        <Card>
          <div className="flex gap-1 mb-4 p-0.5 rounded-2xl w-fit" style={{ background: 'var(--surface2)' }}>
            {([
              { id: 'velo' as const, label: 'Vélo' },
              { id: 'natation' as const, label: 'Natation' },
              { id: 'gainage' as const, label: 'Gainage' },
            ]).map((t) => (
              <button key={t.id} onClick={() => { setCrossTab(t.id); setShowAddCross(false) }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: crossTab === t.id ? 'var(--card)' : 'transparent',
                  color: crossTab === t.id ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow: crossTab === t.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {(!!crossLogs?.length || !!stravaCrossActivities.length) && (
            <div className="flex items-center gap-6 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{(crossLogs?.length ?? 0) + stravaCrossActivities.length}</p>
                <p className="text-[10px] uppercase tracking-wide font-bold mt-1" style={{ color: 'var(--text-2)' }}>séances</p>
              </div>
              {crossTab !== 'gainage' && (
                <div>
                  <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{((crossLogs ?? []).reduce((s, l) => s + (l.distance_km ?? 0), 0) + stravaCrossKm).toFixed(1)}<span className="text-sm font-semibold ml-1" style={{ color: 'var(--text-2)' }}>km</span></p>
                  <p className="text-[10px] uppercase tracking-wide font-bold mt-1" style={{ color: 'var(--text-2)' }}>cumulés</p>
                </div>
              )}
              <div>
                <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{Math.round((crossLogs ?? []).reduce((s, l) => s + l.duration_min, 0) + stravaCrossMin)}<span className="text-sm font-semibold ml-1" style={{ color: 'var(--text-2)' }}>min</span></p>
                <p className="text-[10px] uppercase tracking-wide font-bold mt-1" style={{ color: 'var(--text-2)' }}>temps total</p>
              </div>
            </div>
          )}

          {crossTab !== 'gainage' && !!crossTrendMerged.some((t) => t.km > 0) && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Km par semaine · 8 dernières semaines</p>
              <AreaTrendChart data={crossTrendMerged.map((t) => ({ label: t.label, value: t.km }))} color={crossTab === 'velo' ? '#5B91D8' : '#7B6FD6'} unit="km" />
            </div>
          )}

          {showAddCross && (
            <div className="mb-4 p-3 rounded-xl space-y-2" style={{ background: 'var(--surface2)' }}>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={newCrossDate} onChange={(e) => setNewCrossDate(e.target.value)}
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                <div className="flex gap-1 p-0.5 rounded-[10px]" style={{ background: 'var(--card)' }}>
                  {(['matin', 'apres-midi'] as const).map((slot) => (
                    <button key={slot} type="button" onClick={() => setNewCrossTimeSlot(newCrossTimeSlot === slot ? '' : slot)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize"
                      style={{ background: newCrossTimeSlot === slot ? '#F2C400' : 'transparent', color: newCrossTimeSlot === slot ? '#0E0E0D' : 'var(--text-2)' }}>
                      {slot === 'matin' ? 'Matin' : 'Après-midi'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newCrossDuration} onChange={(e) => setNewCrossDuration(e.target.value)} placeholder="Durée (min)" inputMode="numeric"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                {crossTab !== 'gainage' && (
                  <input value={newCrossDistance} onChange={(e) => setNewCrossDistance(e.target.value)} placeholder="Distance km (option.)"
                    className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                )}
              </div>
              {crossTab === 'velo' && (
                <input value={newCrossAvgSpeed} onChange={(e) => setNewCrossAvgSpeed(e.target.value)} placeholder="Vitesse moyenne (km/h, option.)" inputMode="decimal"
                  className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              )}
              {crossTab === 'gainage' && (
                <div className="py-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--text-2)' }}>Zones travaillées</p>
                  <BodyDiagram selected={newCrossZones} onToggle={(z) => setNewCrossZones((p) => p.includes(z) ? p.filter((x) => x !== z) : [...p, z])} />
                </div>
              )}
              <input value={newCrossNotes} onChange={(e) => setNewCrossNotes(e.target.value)} placeholder="Notes (optionnel)"
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              <div className="flex gap-2">
                <button onClick={() => handleAddCross(crossTab, refetchCrossLogs)} disabled={savingCross || !newCrossDuration.trim()}
                  className="text-xs font-bold px-3 py-1.5 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                  {savingCross ? '…' : editingCrossId ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button onClick={() => { setShowAddCross(false); resetCrossForm() }} className="text-xs font-semibold px-3 py-1.5 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
              </div>
            </div>
          )}

          {!crossLogs?.length && !stravaCrossActivities.length ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucune séance enregistrée.</p>
          ) : (
            <div className="space-y-0">
              {stravaCrossActivities.map((a) => (
                <div key={a.id} className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 text-left" style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0">
                    <span className="text-sm block truncate" style={{ color: 'var(--text-2)' }}>
                      {new Date(a.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {a.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold shrink-0 mx-2" style={{ color: 'var(--text-1)' }}>
                    {(a.distance_m / 1000).toFixed(1)} km · {Math.round(a.moving_time_s / 60)} min
                  </span>
                  <span className="text-[10px] font-bold shrink-0" style={{ color: '#FC5200' }}>Strava</span>
                </div>
              ))}
              {(crossLogs ?? []).map((log) => (
                <button key={log.id} onClick={() => handleEditCross(log)}
                  className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 text-left" style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0">
                    <span className="text-sm block" style={{ color: 'var(--text-2)' }}>
                      {new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      {log.time_slot ? ` · ${log.time_slot === 'matin' ? 'Matin' : 'Après-midi'}` : ''}
                    </span>
                    {!!log.muscle_zones?.length && <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{log.muscle_zones.join(', ')}</span>}
                  </div>
                  <span className="text-sm font-semibold shrink-0 mx-2" style={{ color: 'var(--text-1)' }}>
                    {log.distance_km ? `${log.distance_km} km · ` : ''}{log.avg_speed_kmh ? `${log.avg_speed_kmh} km/h · ` : ''}{log.duration_min} min
                  </span>
                  <span onClick={(e) => { e.stopPropagation(); handleDeleteCross(log.id, refetchCrossLogs) }} className="text-xs font-semibold text-[#E4574A] shrink-0">×</span>
                </button>
              ))}
            </div>
          )}

          {!showAddCross && (
            <button onClick={() => { resetCrossForm(); setShowAddCross(true) }} className="mt-3 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Ajouter une séance {crossTab === 'velo' ? 'vélo' : crossTab === 'natation' ? 'natation' : 'gainage'}
            </button>
          )}
        </Card>
      </div>

      {/* ── Performance ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 7H4L5.5 4L8 10L9.5 7H12.5" stroke="#F2C400" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <SectionLabel>Performance</SectionLabel>
        </div>
        <Card>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-0.5 rounded-2xl w-fit" style={{ background: 'var(--surface2)' }}>
            {([
              { id: 'allures' as const,     label: 'Allures' },
              { id: 'musculation' as const, label: 'Musculation' },
            ]).map((t) => (
              <button key={t.id} onClick={() => setPerfTab(t.id)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: perfTab === t.id ? 'var(--card)' : 'transparent',
                  color: perfTab === t.id ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow: perfTab === t.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {perfTab === 'allures' ? (
            <>
              {/* VMA stepper */}
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>VMA (modifiable)</p>
              <div className="flex items-center gap-4 mb-1">
                <button onClick={() => handleVmaChange(Math.max(10, vma - 0.5))}
                  className="w-9 h-9 rounded-xl text-lg font-bold flex items-center justify-center transition-all active:scale-95"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>−</button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-black" style={{ color: 'var(--text-1)' }}>{vma}</span>
                  <span className="text-sm font-semibold ml-1.5" style={{ color: 'var(--text-2)' }}>km/h</span>
                </div>
                <button onClick={() => handleVmaChange(Math.min(30, vma + 0.5))}
                  className="w-9 h-9 rounded-xl text-lg font-bold flex items-center justify-center transition-all active:scale-95"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>+</button>
              </div>
              <p className="text-xs mb-5" style={{ color: 'var(--text-2)' }}>Enregistrée sur ton profil, utilisée par ton coach pour calculer tes allures.</p>

              {/* Temps de passage table */}
              <p className="text-base font-bold mb-3" style={{ color: 'var(--text-1)' }}>Temps de passage</p>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="grid text-[9px] font-bold uppercase tracking-wider px-3 py-2"
                  style={{ gridTemplateColumns: '1fr 56px 44px 52px 52px', background: 'var(--surface2)', color: 'var(--text-2)' }}>
                  <span>Intensité</span><span className="text-right">Allure</span>
                  <span className="text-right">100m</span><span className="text-right">200m</span><span className="text-right">400m</span>
                </div>
                {VMA_ZONES.map((z, i) => {
                  const speed = (z.pct / 100) * vma
                  return (
                    <div key={z.pct} className="grid items-center px-3 py-2.5 border-b last:border-b-0"
                      style={{ gridTemplateColumns: '1fr 56px 44px 52px 52px', borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                      <div>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{z.pct}%</span>
                        <span className="text-[10px] ml-1.5" style={{ color: 'var(--text-2)' }}>{z.label}</span>
                      </div>
                      <span className="text-xs font-mono text-right" style={{ color: 'var(--text-1)' }}>{paceStr(speed)}</span>
                      <span className="text-xs font-mono text-right" style={{ color: 'var(--text-2)' }}>{splitStr(speed, 100)}</span>
                      <span className="text-xs font-mono text-right" style={{ color: 'var(--text-2)' }}>{splitStr(speed, 200)}</span>
                      <span className="text-xs font-mono text-right" style={{ color: 'var(--text-2)' }}>{splitStr(speed, 400)}</span>
                    </div>
                  )
                })}
              </div>

              <p className="text-base font-bold mb-3 mt-6" style={{ color: 'var(--text-1)' }}>Temps de passage</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
                Entre une distance et un chrono cible pour connaître tes temps de passage intermédiaires.
              </p>
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-2)' }}>Distance (m)</label>
                  <input value={calcDistance} onChange={(e) => setCalcDistance(e.target.value)} inputMode="decimal" placeholder="1500"
                    className="w-full rounded-[10px] px-3 py-2.5 text-sm font-bold outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-2)' }}>Chrono cible</label>
                  <input value={calcTime} onChange={(e) => setCalcTime(e.target.value)} placeholder="4:00"
                    className="w-full rounded-[10px] px-3 py-2.5 text-sm font-bold outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                </div>
              </div>

              {(() => {
                const distanceM = parseFloat(calcDistance.replace(',', '.'))
                const totalSec = parseTimeToSeconds(calcTime)
                const valid = Number.isFinite(distanceM) && distanceM > 0 && totalSec !== null && totalSec > 0
                if (!valid) {
                  return <p className="text-sm py-3" style={{ color: 'var(--text-2)' }}>Renseigne une distance et un chrono valides.</p>
                }
                const speedKmh = (distanceM / totalSec!) * 3.6
                const marks = [...SPLIT_MARKS.filter((m) => m < distanceM), distanceM]
                return (
                  <>
                    <div className="flex items-center gap-4 mb-3 px-1">
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                        Allure <span className="font-bold font-mono" style={{ color: 'var(--text-1)' }}>{paceStr(speedKmh)}/km</span>
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                        Vitesse <span className="font-bold font-mono" style={{ color: 'var(--text-1)' }}>{speedKmh.toFixed(2)} km/h</span>
                      </span>
                    </div>
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      <div className="grid text-[9px] font-bold uppercase tracking-wider px-3 py-2"
                        style={{ gridTemplateColumns: '1fr 110px', background: 'var(--surface2)', color: 'var(--text-2)' }}>
                        <span>Distance</span><span className="text-right">Temps de passage</span>
                      </div>
                      {marks.map((m, i) => {
                        const isFinal = m === distanceM
                        const cumSec = (m / distanceM) * totalSec!
                        return (
                          <div key={m} className="grid items-center px-3 py-2.5 border-b last:border-b-0"
                            style={{
                              gridTemplateColumns: '1fr 110px', borderColor: 'var(--border)',
                              background: isFinal ? 'rgba(242,196,0,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                            }}>
                            <span className="text-xs font-semibold" style={{ color: isFinal ? '#F2C400' : 'var(--text-1)' }}>
                              {distanceLabel(m)}{isFinal ? ' — arrivée' : ''}
                            </span>
                            <span className="text-xs font-mono text-right font-bold" style={{ color: isFinal ? '#F2C400' : 'var(--text-1)' }}>
                              {formatClock(cumSec)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </>
          ) : (
            <>
              <p className="text-base font-bold mb-1" style={{ color: 'var(--text-1)' }}>Maximums &amp; calculateur de charge</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
                Choisis un %1RM pour voir la charge cible sur tous tes exercices d'un coup.
              </p>

              {/* %1RM selector */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {LOAD_PERCENT_TABLE.map((row) => (
                  <button key={row.pct} onClick={() => setMuscuPct(row.pct)}
                    className="px-2.5 py-1.5 rounded-full text-xs font-bold transition-all"
                    style={{
                      background: muscuPct === row.pct ? '#F2C400' : 'var(--surface2)',
                      color: muscuPct === row.pct ? '#0E0E0D' : 'var(--text-1)',
                    }}>
                    {row.pct}%
                  </button>
                ))}
              </div>

              {!strengthMaxes?.length ? (
                <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Aucun maximum enregistré — ajoute ton premier exercice ci-dessous.</p>
              ) : (
                <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
                  <div className="grid text-[9px] font-bold uppercase tracking-wider px-3 py-2"
                    style={{ gridTemplateColumns: '1fr 76px 76px 40px 24px', background: 'var(--surface2)', color: 'var(--text-2)' }}>
                    <span>Exercice</span><span className="text-right">Max</span>
                    <span className="text-right">Charge {muscuPct}%</span><span className="text-right">Reps</span><span />
                  </div>
                  {strengthMaxes.map((m, i) => {
                    const reps = LOAD_PERCENT_TABLE.find((r) => r.pct === muscuPct)?.reps ?? '—'
                    return (
                      <div key={m.id} className="grid items-center px-3 py-2.5 border-b last:border-b-0"
                        style={{ gridTemplateColumns: '1fr 76px 76px 40px 24px', borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                        <span className="text-sm font-semibold truncate pr-1" style={{ color: 'var(--text-1)' }}>{m.exercise}</span>
                        <input defaultValue={m.max_kg} inputMode="decimal" onBlur={(e) => {
                          const v = parseFloat(e.target.value.replace(',', '.'))
                          if (v !== m.max_kg) handleUpdateMax(m.exercise, v)
                        }} className="text-xs text-right font-mono bg-transparent outline-none w-full" style={{ color: 'var(--text-1)' }} />
                        <span className="text-xs text-right font-mono font-bold" style={{ color: '#F2C400' }}>{((m.max_kg * muscuPct) / 100).toFixed(1)}</span>
                        <span className="text-xs text-right" style={{ color: 'var(--text-2)' }}>{reps}</span>
                        <button onClick={() => handleDeleteMax(m.id)} className="text-xs font-semibold text-[#E4574A] text-right">×</button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-2 mb-5">
                <input value={newExercise} onChange={(e) => setNewExercise(e.target.value)} placeholder="Exercice (ex: Squat)"
                  className="flex-1 rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                <input value={newMax} onChange={(e) => setNewMax(e.target.value)} placeholder="Max kg" inputMode="decimal"
                  className="w-24 rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                <button onClick={handleSaveMax} disabled={!newExercise.trim() || !newMax}
                  className="text-xs font-bold px-3 py-2 rounded-[10px] disabled:opacity-50 shrink-0" style={{ background: '#F2C400', color: '#0E0E0D' }}>OK</button>
              </div>

              <p className="text-base font-bold mb-3" style={{ color: 'var(--text-1)' }}>Séances</p>
              {!!muscLogs?.length && (
                <div className="flex items-center gap-6 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{muscLogs.length}</p>
                    <p className="text-[10px] uppercase tracking-wide font-bold mt-1" style={{ color: 'var(--text-2)' }}>séances</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{muscLogs.reduce((s, l) => s + l.duration_min, 0)}<span className="text-sm font-semibold ml-1" style={{ color: 'var(--text-2)' }}>min</span></p>
                    <p className="text-[10px] uppercase tracking-wide font-bold mt-1" style={{ color: 'var(--text-2)' }}>temps total</p>
                  </div>
                </div>
              )}

              {showAddCross && (
                <div className="mb-4 p-4 rounded-2xl space-y-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Date</label>
                      <input type="date" value={newCrossDate} onChange={(e) => setNewCrossDate(e.target.value)}
                        className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Créneau</label>
                      <div className="flex gap-1 p-0.5 rounded-[10px]" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                        {(['matin', 'apres-midi'] as const).map((slot) => (
                          <button key={slot} type="button" onClick={() => setNewCrossTimeSlot(newCrossTimeSlot === slot ? '' : slot)}
                            className="flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize"
                            style={{ background: newCrossTimeSlot === slot ? '#F2C400' : 'transparent', color: newCrossTimeSlot === slot ? '#0E0E0D' : 'var(--text-2)' }}>
                            {slot === 'matin' ? 'Matin' : 'Après-midi'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Durée (min)</label>
                    <input value={newCrossDuration} onChange={(e) => setNewCrossDuration(e.target.value)} placeholder="Ex: 45" inputMode="numeric"
                      className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Notes</label>
                    <input value={newCrossNotes} onChange={(e) => setNewCrossNotes(e.target.value)} placeholder="Ex: Haut du corps, squat 60kg..."
                      className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleAddCross('musculation', refetchMuscLogs)} disabled={savingCross || !newCrossDuration.trim()}
                      className="text-xs font-bold px-4 py-2 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                      {savingCross ? '…' : editingCrossId ? 'Enregistrer' : 'Ajouter'}
                    </button>
                    <button onClick={() => { setShowAddCross(false); resetCrossForm() }} className="text-xs font-semibold px-4 py-2 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
                  </div>
                </div>
              )}
              {!muscLogs?.length ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
                    <path d="M3 11H5M17 11H19M5 11V8H8V14H5V11ZM17 11V8H14V14H17V11ZM8 11H14" stroke="var(--text-2)" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucune séance de musculation enregistrée.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {muscLogs.map((log) => (
                    <div key={log.id} onClick={() => handleEditCross(log)}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-2xl cursor-pointer" style={{ background: 'var(--surface2)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(228,87,74,0.12)' }}>
                        <svg width="15" height="15" viewBox="0 0 22 22" fill="none">
                          <path d="M3 11H5M17 11H19M5 11V8H8V14H5V11ZM17 11V8H14V14H17V11ZM8 11H14" stroke="#E4574A" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold block" style={{ color: 'var(--text-1)' }}>
                          {new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {log.time_slot ? ` · ${log.time_slot === 'matin' ? 'Matin' : 'Après-midi'}` : ''} · {log.duration_min} min
                        </span>
                        {log.notes && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>{log.notes}</p>}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCross(log.id, refetchMuscLogs) }}
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ color: 'var(--text-2)' }}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!showAddCross && (
                <button onClick={() => { resetCrossForm(); setShowAddCross(true) }} className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-[#F2C400] flex items-center justify-center gap-1.5"
                  style={{ border: '1px dashed rgba(242,196,0,0.35)' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Ajouter une séance musculation
                </button>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  )

  return (
    <>
      <div className="lg:hidden p-4 space-y-4 max-w-2xl mx-auto pb-8">
        {sectionA}
        {objectifsSection}
        {sectionB}
      </div>

      <div className="hidden lg:block" style={{ background: 'var(--bg)' }}>
        <div className="max-w-[1320px] mx-auto px-4 py-6">
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '240px 1fr 300px' }}>
            <AthleteDesktopSidebar />
            <div className="space-y-4">
              {sectionA}
              {sectionB}
            </div>
            <div className="space-y-4">
              {objectifsSection}
            </div>
          </div>
        </div>
      </div>

      {showAddSession && (
        <AddSessionSheet
          date={new Date(now.getFullYear(), now.getMonth(), selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          onClose={() => setShowAddSession(false)}
          onSave={handleLogFreeSession}
        />
      )}
    </>
  )
}
