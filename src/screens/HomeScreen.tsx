import { useState, useEffect, useRef } from 'react'
import { Card, SectionLabel } from '../components/ui'
import { useApp } from '../context/AppContext'
import WeeklyRecapModal from '../components/WeeklyRecapModal'
import AddSessionSheet, { type SessionData } from '../components/AddSessionSheet'
import { useQuery } from '../lib/useQuery'
import { fetchAthleteSessions, validateSession, logFreeSession, saveSessionSplits, fetchSessionWorkBlocks, type AthleteSession, type WorkBlockWithTargets } from '../lib/queries/sessions'
import { fetchTodayCheckin, saveCheckin, type DailyCheckin } from '../lib/queries/checkins'
import { fetchAthleteWeekStats, fetchAthleteTotalKm, fetchLastActivity } from '../lib/queries/stats'
import { fetchNextCompetition, fetchMyGroups, fetchWeightLogs, saveWeightLog, type WeightLog } from '../lib/queries/profileExtras'
import { fetchDisciplineBreakdown, fetchWeeklyLoad, type DisciplineBreakdown } from '../lib/queries/crossTraining'
import { fetchSessionTypeBreakdown, TYPE_COLORS, type TypeBreakdown } from '../lib/queries/stats'
import { DonutChart, LoadChart, GenericDonutChart } from '../components/charts'
import AthleteDesktopSidebar from '../components/AthleteDesktopSidebar'

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7 // Monday = 0
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - day)
  return s
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

// ── Animated counter ──────────────────────────────────────────────────────

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const duration = 900
    const start = performance.now()
    const raf = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [target])
  return <>{value}{suffix}</>
}

// ── Animated progress bar ────────────────────────────────────────────────

function ProgressBar({ pct, color = '#F2C400' }: { pct: number; color?: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 80); return () => clearTimeout(t) }, [pct])
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
      <div className="h-full rounded-full"
        style={{ width: `${width}%`, background: color, transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }} />
    </div>
  )
}

// ── Progress ring ─────────────────────────────────────────────────────────

function ProgressRing({ value, max, size = 72, label, sublabel }: {
  value: number; max: number; size?: number; label: string; sublabel: string
}) {
  const stroke = 5
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setDash(Math.min(value / max, 1) * circ), 100)
    return () => clearTimeout(t)
  }, [value, max, circ])
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface2)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F2C400" strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16, 1, 0.3, 1)', strokeLinecap: 'round' }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-sm font-black leading-none" style={{ color: 'var(--text-1)' }}>{label}</p>
        <p className="text-[8px] tracking-wider mt-0.5" style={{ color: 'var(--text-2)' }}>{sublabel}</p>
      </div>
    </div>
  )
}

// ── Segmented form picker (Apple-style) ───────────────────────────────────

const LEVELS = [2, 4, 6, 8, 10]

function FormSegment({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="flex gap-1 flex-1">
      {LEVELS.map((v) => (
        <button key={v} onClick={() => onChange(v)}
          className="btn-press flex-1 h-2 rounded-full"
          style={{
            background: value >= v ? color : 'var(--surface2)',
            transform: value >= v ? 'scaleY(1.4)' : 'scaleY(1)',
            transition: 'background 0.15s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
      ))}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────

function IcSleep({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M8 1.5C5 2 3 4.5 3 7.5C3 10.5 5.5 13 8.5 13C11 13 13 11.5 13.5 9C12.5 9.5 11.5 9.5 10.5 9C9 8.5 8 7 8 5.5C8 4 8.5 2.5 9.5 1.5C9 1.5 8.5 1.5 8 1.5Z"
        stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IcLightning({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M8.5 1.5L3.5 7.5H7L5.5 12.5L11 6.5H7.5L8.5 1.5Z"
        stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IcBattery({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="4" width="9" height="6" rx="1.5" stroke={color} strokeWidth="1.3" />
      <path d="M11.5 6V8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 7H6.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IcActivity({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 7H4L5.5 4L8 10L9.5 7H12.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IcBrain({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 12C7 12 3 10 3 6.5C3 4.5 4.5 3 7 3C9.5 3 11 4.5 11 6.5C11 10 7 12 7 12Z"
        stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7 3V12M4.5 5.5C5 5 6 5 7 5C8 5 9 5 9.5 5.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const STATUS_COLOR = { done: '#5EBA65', todo: '#F2C400' }

type FormKey = 'sleep' | 'motivation' | 'fatigue' | 'soreness' | 'stress'
const FORM_FIELDS: Array<{ key: FormKey; label: string; icon: (c: string) => React.ReactNode; color: string }> = [
  { key: 'sleep', label: 'Sommeil', icon: (c) => <IcSleep color={c} />, color: '#5B91D8' },
  { key: 'motivation', label: 'Motivation', icon: (c) => <IcLightning color={c} />, color: '#F2C400' },
  { key: 'fatigue', label: 'Fatigue', icon: (c) => <IcBattery color={c} />, color: '#E4574A' },
  { key: 'soreness', label: 'Courbatures', icon: (c) => <IcActivity color={c} />, color: '#5B91D8' },
  { key: 'stress', label: 'Stress', icon: (c) => <IcBrain color={c} />, color: '#5EBA65' },
]

// ── Main screen ───────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { profile } = useApp()
  const athleteName = profile?.name ?? ''
  const initials = athleteName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const [selectedDay, setSelectedDay] = useState((new Date().getDay() + 6) % 7)
  const [weekOffset, setWeekOffset] = useState(0)
  const [form, setForm] = useState<Record<FormKey, number>>({ sleep: 7.5, motivation: 8, fatigue: 4, soreness: 2, stress: 4 })
  const [formSent, setFormSent] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [showAddSession, setShowAddSession] = useState(false)
  const [validating, setValidating] = useState(false)

  const today = new Date()
  const todayIso = isoDate(today)
  const tomorrowIso = isoDate(new Date(today.getTime() + 24 * 3600 * 1000))
  const viewedWeekStart = new Date(startOfWeek(today))
  viewedWeekStart.setDate(viewedWeekStart.getDate() + weekOffset * 7)
  const weekStart = isoDate(viewedWeekStart)
  const weekEnd = isoDate(new Date(viewedWeekStart.getTime() + 7 * 24 * 3600 * 1000))

  const { data: todaySessions, refetch: refetchToday } = useQuery<AthleteSession[]>(
    () => (profile ? fetchAthleteSessions(profile.id, todayIso, tomorrowIso) : Promise.resolve([])),
    [profile?.id, todayIso],
  )
  const todaySession = todaySessions?.[0] ?? null

  const { data: weekStats } = useQuery(
    () => (profile ? fetchAthleteWeekStats(profile.id, weekStart, weekEnd) : Promise.resolve(null)),
    [profile?.id, weekStart],
  )

  const { data: weekSessions, refetch: refetchWeekSessions } = useQuery<AthleteSession[]>(
    () => (profile ? fetchAthleteSessions(profile.id, weekStart, weekEnd) : Promise.resolve([])),
    [profile?.id, weekStart],
  )
  const dayStatusByDate = new Map<string, 'done' | 'todo'>()
  for (const s of weekSessions ?? []) {
    const d = isoDate(new Date(s.scheduled_at))
    if (s.completion?.status === 'done') dayStatusByDate.set(d, 'done')
    else if (!dayStatusByDate.has(d)) dayStatusByDate.set(d, 'todo')
  }
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(viewedWeekStart)
    d.setDate(d.getDate() + i)
    return d
  })
  const weekLabel = weekOffset === 0 ? "Cette semaine" : weekOffset === -1 ? "Semaine dernière" : weekOffset === 1 ? "Semaine prochaine"
    : `${weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${weekDates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
  const weekKmByDay = weekDates.map((d) => {
    const iso = isoDate(d)
    return (weekSessions ?? [])
      .filter((s) => isoDate(new Date(s.scheduled_at)) === iso && s.completion?.status === 'done')
      .reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
  })

  useQuery<DailyCheckin | null>(
    () => (profile ? fetchTodayCheckin(profile.id, todayIso).then((c) => { if (c) setForm(c); return c }) : Promise.resolve(null)),
    [profile?.id, todayIso],
  )

  const { data: nextComp } = useQuery(
    () => (profile ? fetchNextCompetition(profile.id) : Promise.resolve(null)),
    [profile?.id],
  )
  const { data: myGroups } = useQuery(
    () => (profile ? fetchMyGroups(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: totalKm } = useQuery(
    () => (profile ? fetchAthleteTotalKm(profile.id) : Promise.resolve(0)),
    [profile?.id],
  )
  const { data: lastActivity } = useQuery(
    () => (profile ? fetchLastActivity(profile.id) : Promise.resolve(null)),
    [profile?.id],
  )
  const { data: weightLogs, refetch: refetchWeightLogs } = useQuery<WeightLog[]>(
    () => (profile ? fetchWeightLogs(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const daysToComp = nextComp?.event_date
    ? Math.max(0, Math.ceil((new Date(nextComp.event_date).getTime() - today.getTime()) / 86400000))
    : null

  const monthAgo = new Date(today.getTime() - 30 * 86400000).toISOString()
  const { data: breakdown } = useQuery<DisciplineBreakdown[]>(
    () => (profile ? fetchDisciplineBreakdown(profile.id, monthAgo, today.toISOString()) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: load } = useQuery(
    () => (profile ? fetchWeeklyLoad(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: typeBreakdown } = useQuery<TypeBreakdown[]>(
    () => (profile ? fetchSessionTypeBreakdown(profile.id, monthAgo, today.toISOString()) : Promise.resolve([])),
    [profile?.id],
  )

  const [showRpe, setShowRpe] = useState(false)

  const selectedDate = weekDates[selectedDay] ?? today
  const selectedDateIso = isoDate(selectedDate)
  const selectedIsToday = selectedDateIso === todayIso
  const selectedSession = (weekSessions ?? []).find((s) => isoDate(new Date(s.scheduled_at)) === selectedDateIso) ?? null

  const { data: workBlocks } = useQuery<WorkBlockWithTargets[]>(
    () => (selectedSession ? fetchSessionWorkBlocks(selectedSession.id) : Promise.resolve([])),
    [selectedSession?.id],
  )
  const myGroupIds = new Set((myGroups ?? []).map((g) => g.id))
  const myWorkBlock = workBlocks?.find((b) => b.group_id && myGroupIds.has(b.group_id)) ?? null

  const [rpe, setRpe] = useState<number | null>(null)
  const [actualDistance, setActualDistance] = useState('')
  const [actualDuration, setActualDuration] = useState('')
  const [splits, setSplits] = useState<string[]>([])

  function resetValidationForm() {
    setRpe(null); setActualDistance(''); setActualDuration(''); setSplits([])
  }

  async function handleValidateSession() {
    if (!profile || !selectedSession || rpe === null) return
    setValidating(true)
    try {
      const distanceKm = actualDistance ? parseFloat(actualDistance.replace(',', '.')) : null
      const durationMin = actualDuration ? parseInt(actualDuration, 10) : null
      const completionId = await validateSession(selectedSession.id, profile.id, rpe, '', distanceKm, durationMin)
      const parsedSplits = splits
        .map((s, i) => ({ rep_number: i + 1, time_seconds: parseFloat(s.replace(',', '.')) }))
        .filter((s) => !Number.isNaN(s.time_seconds) && s.time_seconds > 0)
      if (parsedSplits.length > 0) await saveSessionSplits(completionId, parsedSplits)
      await Promise.all([refetchToday(), refetchWeekSessions()])
      setShowRpe(false)
      resetValidationForm()
    } finally {
      setValidating(false)
    }
  }

  const overviewBlock = (
    <div className="space-y-4">
      <Card>
        <SectionLabel>Répartition par sport · 30 derniers jours</SectionLabel>
        <div className="mt-3">
          {!breakdown?.length ? (
            <p className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Aucune séance enregistrée sur les 30 derniers jours.</p>
          ) : (
            <DonutChart segments={breakdown} />
          )}
        </div>
      </Card>
      <Card>
        <SectionLabel>Répartition par type d&apos;entraînement · 30 derniers jours</SectionLabel>
        <div className="mt-3">
          {!typeBreakdown?.length ? (
            <p className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Aucune séance enregistrée sur les 30 derniers jours.</p>
          ) : (
            <GenericDonutChart segments={typeBreakdown.map((t) => ({ label: t.type, count: t.count }))} colors={TYPE_COLORS} />
          )}
        </div>
      </Card>
      <Card>
        <SectionLabel>Charge d&apos;entraînement</SectionLabel>
        <p className="text-xs mb-3 mt-0.5" style={{ color: 'var(--text-2)' }}>RPE × durée · 8 dernières semaines</p>
        {load && load.length > 0 ? <LoadChart data={load} /> : <p className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Pas encore de données de charge.</p>}
      </Card>
    </div>
  )

  const RPE_OPTIONS = [{ v: 2, l: 'Facile' }, { v: 4, l: 'Modéré' }, { v: 6, l: 'Soutenu' }, { v: 8, l: 'Dur' }, { v: 10, l: 'Max' }]
  const validationPace = (() => {
    const d = actualDistance ? parseFloat(actualDistance.replace(',', '.')) : null
    const m = actualDuration ? parseInt(actualDuration, 10) : null
    if (!d || !m || d <= 0) return null
    const secPerKm = (m * 60) / d
    const mm = Math.floor(secPerKm / 60)
    const ss = Math.round(secPerKm % 60)
    return `${mm}'${ss.toString().padStart(2, '0')}"/km`
  })()
  function RpePicker() {
    return (
      <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Ressenti de la séance (RPE)</p>
          <div className="flex gap-1.5">
            {RPE_OPTIONS.map((o) => (
              <button key={o.v} disabled={validating} onClick={() => setRpe(o.v)}
                className="flex-1 py-2 rounded-[10px] text-[10px] font-bold disabled:opacity-50"
                style={{ background: rpe === o.v ? '#F2C400' : 'var(--surface2)', color: rpe === o.v ? '#0E0E0D' : 'var(--text-1)' }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Distance réelle (km)</p>
            <input value={actualDistance} onChange={(e) => setActualDistance(e.target.value)} inputMode="decimal"
              placeholder={selectedSession?.distance_km ? String(selectedSession.distance_km) : '—'}
              className="w-full px-3 py-2 rounded-[10px] text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Durée réelle (min)</p>
            <input value={actualDuration} onChange={(e) => setActualDuration(e.target.value)} inputMode="numeric"
              placeholder={selectedSession?.duration_min ? String(selectedSession.duration_min) : '—'}
              className="w-full px-3 py-2 rounded-[10px] text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
          </div>
        </div>
        {validationPace && (
          <p className="text-xs -mt-2" style={{ color: '#F2C400' }}>Allure moyenne : <span className="font-bold">{validationPace}</span></p>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Temps par répétition (optionnel)</p>
            <div className="flex items-center gap-3">
              {!!myWorkBlock?.target_splits.length && splits.length === 0 && (
                <button onClick={() => setSplits(myWorkBlock.target_splits.map(() => ''))} className="text-xs font-bold" style={{ color: '#5B91D8' }}>
                  Pré-remplir ({myWorkBlock.target_splits.length})
                </button>
              )}
              <button onClick={() => setSplits((p) => [...p, ''])} className="text-xs font-bold" style={{ color: '#F2C400' }}>+ Ajouter</button>
            </div>
          </div>
          {splits.length > 0 && (
            <div className="space-y-1.5">
              {splits.map((s, i) => {
                const target = myWorkBlock?.target_splits[i]?.target_time_seconds
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-2)' }}>Rép. {i + 1}</span>
                    <input value={s} onChange={(e) => setSplits((p) => p.map((v, j) => j === i ? e.target.value : v))}
                      placeholder={target ? `cible ${target}s` : 'secondes'} inputMode="decimal"
                      className="flex-1 px-3 py-1.5 rounded-[10px] text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                    <button onClick={() => setSplits((p) => p.filter((_, j) => j !== i))} className="text-xs" style={{ color: '#E4574A' }}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button onClick={handleValidateSession} disabled={validating || rpe === null}
          className="w-full py-3 rounded-[12px] text-sm font-bold disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
          {validating ? 'Enregistrement…' : 'Enregistrer la séance'}
        </button>
      </div>
    )
  }

  async function handleSaveCheckin() {
    if (!profile) return
    await saveCheckin(profile.id, todayIso, form)
    setFormSent(true)
  }

  async function handleLogFreeSession(data: SessionData) {
    if (!profile) return
    await logFreeSession(profile.id, data.title, data.distance ?? 0, data.duration)
  }

  // ── Desktop: 3-column grid ──────────────────────────────────────────────
  const dayStrip = (
    <Card className="!p-3">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <button onClick={() => setWeekOffset((w) => w - 1)}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--surface2)' }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{weekLabel}</span>
        <button onClick={() => setWeekOffset((w) => w + 1)}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--surface2)' }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => {
          const isSelected = i === selectedDay
          const status = dayStatusByDate.get(isoDate(weekDates[i])) ?? null
          return (
            <button key={i} onClick={() => setSelectedDay(i)}
              className="btn-press flex flex-col items-center gap-1.5 py-2.5 rounded-2xl min-w-0"
              style={{
                background: isSelected ? '#F2C400' : 'var(--surface2)',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                transition: 'background 0.28s, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
              <span className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: isSelected ? '#0E0E0D' : 'var(--text-2)' }}>{d}</span>
              <span className="text-sm font-black"
                style={{ color: isSelected ? '#0E0E0D' : 'var(--text-1)' }}>{weekDates[i].getDate()}</span>
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: status ? (isSelected ? '#0E0E0D' : STATUS_COLOR[status]) : 'transparent' }} />
            </button>
          )
        })}
      </div>
    </Card>
  )

  const isDone = selectedSession?.completion?.status === 'done'
  const sessionCard = (
    <Card lift>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>{selectedIsToday ? 'Séance du jour' : `Séance du ${selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}</SectionLabel>
        {selectedSession && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: isDone ? 'rgba(94,186,101,0.15)' : 'rgba(242,196,0,0.15)', color: isDone ? '#5EBA65' : '#F2C400' }}>
            {isDone ? 'Faite' : 'À faire'}
          </span>
        )}
      </div>
      {!selectedSession ? (
        <p className="text-sm py-4" style={{ color: 'var(--text-2)' }}>Aucune séance programmée {selectedIsToday ? "aujourd'hui" : 'ce jour-là'}.</p>
      ) : (
        <>
          <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{selectedSession.title}</p>
          {selectedSession.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{selectedSession.description}</p>}
          <div className="flex gap-6 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Distance', value: selectedSession.distance_km ? `${selectedSession.distance_km} km` : '—' },
              { label: '%VMA', value: selectedSession.vma_percent ? `${selectedSession.vma_percent}%` : '—' },
              { label: 'Durée', value: selectedSession.duration_min ? `${selectedSession.duration_min} min` : '—' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-2)' }}>{s.label}</p>
                <p className="text-base font-black" style={{ color: 'var(--text-1)' }}>{s.value}</p>
              </div>
            ))}
          </div>
          {!isDone && !showRpe && (
            <button onClick={() => setShowRpe(true)}
              className="btn-press w-full mt-4 rounded-[12px] py-3 text-sm font-bold bg-[#F2C400] text-[#0E0E0D]">
              Valider la séance
            </button>
          )}
          {!isDone && showRpe && <RpePicker />}
        </>
      )}
    </Card>
  )

  const formCard = (
    <Card>
      <SectionLabel>Bilan de forme — Aujourd&apos;hui</SectionLabel>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#5B91D818' }}>
            <IcSleep color="#5B91D8" />
          </div>
          <span className="text-sm w-24 shrink-0" style={{ color: 'var(--text-2)' }}>Sommeil</span>
          <div className="flex-1 flex items-center justify-end gap-3">
            <button onClick={() => setForm((p) => ({ ...p, sleep: Math.max(0, p.sleep - 0.5) }))}
              className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>−</button>
            <span className="text-sm font-bold tabular-nums" style={{ color: '#5B91D8' }}>{form.sleep}h</span>
            <button onClick={() => setForm((p) => ({ ...p, sleep: Math.min(14, p.sleep + 0.5) }))}
              className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>+</button>
          </div>
        </div>
        {FORM_FIELDS.filter((f) => f.key !== 'sleep').map(({ key, label, icon, color }) => {
          const val = form[key]
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                {icon(color)}
              </div>
              <span className="text-sm w-24 shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
              <FormSegment value={val} onChange={(v) => setForm((p) => ({ ...p, [key]: v }))} color={color} />
              <span className="text-sm font-bold w-8 text-right shrink-0 tabular-nums" style={{ color }}>{val}/10</span>
            </div>
          )
        })}
      </div>
      <button onClick={handleSaveCheckin}
        className="btn-press w-full mt-5 rounded-[12px] py-3 text-sm font-semibold"
        style={{
          background: formSent ? 'rgba(46,163,80,0.1)' : 'var(--surface2)',
          color: formSent ? '#2EA350' : 'var(--text-1)',
          transition: 'background 0.3s ease, color 0.3s ease',
        }}>
        {formSent ? 'Bilan envoyé au coach ✓' : 'Valider le bilan du jour'}
      </button>
    </Card>
  )

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="screen-enter">

      {/* ── Mobile layout ── */}
      <div className="lg:hidden p-4 space-y-4">
        <div className="flex items-start justify-between pt-1">
          <div>
            <p className="text-sm capitalize" style={{ color: 'var(--text-2)' }}>
              {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-2xl font-black mt-0.5" style={{ color: 'var(--text-1)' }}>Bonjour, {athleteName.split(' ')[0]}</h1>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: 'var(--avatar)', color: 'var(--avatar-text)' }}>{initials}</div>
        </div>
        {/* ── Weekly recap trigger ── */}
        <button onClick={() => setShowRecap(true)}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: '#0B0B0A', border: '1px solid rgba(242,196,0,0.2)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(242,196,0,0.15)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="#F2C400" strokeWidth="1.3" />
              <path d="M8 5v3.5l2.5 1.5" stroke="#F2C400" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-bold text-[#F2C400]">RÉCAP DE LA SEMAINE</p>
            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {Math.round(weekStats?.kmDone ?? 0)} km · {weekStats?.sessionsDone ?? 0} séance{(weekStats?.sessionsDone ?? 0) > 1 ? 's' : ''}
              {nextComp ? ` · ${nextComp.title} dans ${daysToComp} j` : ''}
            </p>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L9 7L5 11" stroke="rgba(242,196,0,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div className="card-gradient-yellow rounded-[20px] p-4 relative overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #F2C400, transparent)' }} />
            <SectionLabel>Ma semaine</SectionLabel>
            <p className="text-4xl font-black leading-none" style={{ color: 'var(--text-1)' }}>
              <AnimatedNumber target={Math.round(weekStats?.kmDone ?? 0)} /><span className="text-xl font-semibold ml-1" style={{ color: 'var(--text-2)' }}>km</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>sur {Math.round(weekStats?.kmPlanned ?? 0)} km prévus</p>
            <div className="mt-4"><ProgressBar pct={weekStats?.kmPlanned ? Math.min(100, (weekStats.kmDone / weekStats.kmPlanned) * 100) : 0} /></div>
          </div>
          <div className="card-gradient-red rounded-[20px] p-4 relative overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #E4574A, transparent)' }} />
            <SectionLabel>Prochaine échéance</SectionLabel>
            {!nextComp ? (
              <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Aucune compétition programmée</p>
            ) : (
              <>
                <p className="text-base font-black" style={{ color: 'var(--text-1)' }}>{nextComp.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {nextComp.distance_km ? `${nextComp.distance_km} km` : ''}{nextComp.target_time ? ` · ${nextComp.target_time}` : ''}
                </p>
                <div className="flex gap-1.5 mt-3">
                  <div className="flex-1 rounded-xl py-2 text-center" style={{ background: 'var(--surface2)' }}>
                    <p className="text-xl font-black leading-none" style={{ color: '#E4574A' }}><AnimatedNumber target={daysToComp ?? 0} /></p>
                    <p className="text-[8px] mt-1" style={{ color: 'var(--text-2)' }}>JOURS</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {dayStrip}
        {sessionCard}
        <button onClick={() => setShowAddSession(true)}
          className="btn-press w-full rounded-3xl py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-all"
          style={{ border: '1px dashed var(--border)', color: 'var(--text-2)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Ajouter une séance libre
        </button>
        <div className="grid grid-cols-2 gap-3">
          <div className="card-gradient-blue rounded-[20px] p-4 relative overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #5B91D8, transparent)' }} />
            <SectionLabel>Total cumulé</SectionLabel>
            <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-1)' }}><AnimatedNumber target={Math.round(totalKm ?? 0)} /><span className="text-base font-medium ml-1" style={{ color: 'var(--text-2)' }}>km</span></p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-2)' }}>Depuis ton inscription</p>
          </div>
          <div className="card-gradient-yellow rounded-[20px] p-4 relative overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #F2C400, transparent)' }} />
            <SectionLabel>VMA actuelle</SectionLabel>
            {profile?.vma ? (
              <p className="text-3xl font-black leading-none" style={{ color: '#F2C400' }}>{profile.vma}<span className="text-base font-medium ml-1" style={{ color: 'var(--text-2)' }}>km/h</span></p>
            ) : (
              <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Non renseignée</p>
            )}
          </div>
        </div>
        {formCard}
        <WeightCard logs={weightLogs ?? []} onSaved={refetchWeightLogs} profileId={profile?.id ?? ''} />
        {overviewBlock}
      </div>

      {/* ── Desktop: Strava-style layout ── */}
      <div className="hidden lg:block" style={{ background: 'var(--bg)' }}>
        <div className="max-w-[1320px] mx-auto px-4 py-6">
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '240px 1fr 300px' }}>

            {/* ════ LEFT PANEL — shared across athlete desktop pages ════ */}
            <AthleteDesktopSidebar selectedDay={selectedDay} onSelectDay={setSelectedDay} />

            {/* ════ CENTER FEED ════ */}
            <div className="space-y-4">
              {/* Filter bar — like Strava "Abonnements" dropdown */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-1)', boxShadow: 'var(--card-shadow)' }}>
                  <span>Mes activités</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-xs capitalize" style={{ color: 'var(--text-2)' }}>
                  {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Today's planned session */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
                {/* Card header */}
                <div className="flex items-start justify-between p-4 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: 'var(--avatar)', color: 'var(--avatar-text)' }}>{initials}</div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{athleteName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  {selectedSession && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: isDone ? 'rgba(94,186,101,0.12)' : 'rgba(242,196,0,0.12)', color: isDone ? '#5EBA65' : '#F2C400', border: `1px solid ${isDone ? 'rgba(94,186,101,0.2)' : 'rgba(242,196,0,0.2)'}` }}>
                      {isDone ? 'FAITE' : 'PLANIFIÉE'}
                    </span>
                  )}
                </div>

                {!selectedSession ? (
                  <p className="px-4 pb-5 text-sm" style={{ color: 'var(--text-2)' }}>Aucune séance programmée {selectedIsToday ? "aujourd'hui" : 'ce jour-là'}.</p>
                ) : (
                  <>
                    {/* Activity title */}
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 12L7 6L9.5 9L11.5 6L13.5 8" stroke="var(--text-2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="4" r="1.8" stroke="var(--text-2)" strokeWidth="1.2" />
                        </svg>
                        <p className="text-xl font-black" style={{ color: 'var(--text-1)' }}>{selectedSession.title}</p>
                      </div>
                      {selectedSession.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{selectedSession.description}</p>}
                    </div>

                    {/* Stats row */}
                    <div className="px-4 pb-4 flex items-center gap-10">
                      {[
                        { label: 'Distance', value: selectedSession.distance_km ? `${selectedSession.distance_km} km` : '—' },
                        { label: 'Durée est.', value: selectedSession.duration_min ? `${selectedSession.duration_min} min` : '—' },
                        { label: 'Intensité', value: selectedSession.vma_percent ? `VMA ${selectedSession.vma_percent}%` : '—', accent: true },
                      ].map((s) => (
                        <div key={s.label}>
                          <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-2)' }}>{s.label}</p>
                          <p className="text-[17px] font-black" style={{ color: s.accent ? '#F2C400' : 'var(--text-1)' }}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action bar */}
                    {!isDone && !showRpe && (
                      <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <button onClick={() => setShowRpe(true)}
                          className="btn-press flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#F2C400] text-[#0E0E0D]">
                          Valider la séance
                        </button>
                      </div>
                    )}
                    {!isDone && showRpe && <div className="px-4 pb-4"><RpePicker /></div>}
                  </>
                )}
              </div>

              <WeightCard logs={weightLogs ?? []} onSaved={refetchWeightLogs} profileId={profile?.id ?? ''} />
              {overviewBlock}
            </div>

            {/* ════ RIGHT PANEL — widgets ════ */}
            <div className="space-y-4">

              {/* Prochain défi / challenge card */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#F2C400] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="#0E0E0D" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--text-1)' }}>Défis</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Inscrivez-vous à un défi de course à pied pour gagner des badges.</p>
                    <button className="mt-2 text-xs font-bold" style={{ color: '#F2C400' }}>
                      Afficher tous les défis →
                    </button>
                  </div>
                </div>
              </div>

              {/* Vos groupes */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
                <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>Vos groupes</p>
                {!myGroups?.length ? (
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>Tu n'es dans aucun groupe pour l'instant.</p>
                ) : (
                  <div className="space-y-2">
                    {myGroups.map((g) => (
                      <div key={g.id} className="px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                        {g.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Countdown */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-2)' }}>Prochaine compétition</p>
                {!nextComp ? (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Aucune compétition programmée</p>
                ) : (
                  <>
                    <p className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{nextComp.title}</p>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>
                      {nextComp.distance_km ? `${nextComp.distance_km} km · ` : ''}
                      {new Date(nextComp.event_date!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {nextComp.target_time ? ` · Objectif : ${nextComp.target_time}` : ''}
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-xl py-3 text-center" style={{ background: 'var(--surface2)' }}>
                        <p className="text-2xl font-black leading-none" style={{ color: '#F2C400' }}><AnimatedNumber target={daysToComp ?? 0} /></p>
                        <p className="text-[8px] tracking-widest mt-1 font-semibold" style={{ color: 'var(--text-2)' }}>JOURS</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Form bilan compact */}
              {formCard}
            </div>
          </div>
        </div>
      </div>

      {showRecap && (
        <WeeklyRecapModal onClose={() => setShowRecap(false)} data={{
          todaySession: todaySession ? {
            title: todaySession.title, vmaPercent: todaySession.vma_percent,
            durationMin: todaySession.duration_min, distanceKm: todaySession.distance_km,
          } : null,
          sessionsDone: weekStats?.sessionsDone ?? 0,
          sessionsPlanned: weekStats?.sessionsPlanned ?? 0,
          weekKmDone: weekStats?.kmDone ?? 0,
          weekKmPlanned: weekStats?.kmPlanned ?? 0,
          weekKmByDay,
          weekMinutesDone: (weekSessions ?? []).filter((s) => s.completion?.status === 'done').reduce((sum, s) => sum + (s.duration_min ?? 0), 0),
          nextComp: nextComp ? {
            title: nextComp.title, eventDate: nextComp.event_date, distanceKm: nextComp.distance_km, targetTime: nextComp.target_time,
          } : null,
          currentWeightKg: weightLogs?.length ? weightLogs[weightLogs.length - 1].weight_kg : null,
        }} />
      )}
      {showAddSession && <AddSessionSheet onClose={() => setShowAddSession(false)} onSave={handleLogFreeSession} />}
    </div>
  )
}


// ── Weight Card ───────────────────────────────────────────────────────────

function WeightCard({ logs, onSaved, profileId }: { logs: WeightLog[]; onSaved: () => void; profileId: string }) {
  const [weightInput, setWeightInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartVisible, setChartVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setChartVisible(true) }, { threshold: 0.15 })
    if (chartRef.current) obs.observe(chartRef.current)
    return () => obs.disconnect()
  }, [])

  async function handleSave() {
    const kg = parseFloat(weightInput.replace(',', '.'))
    if (!profileId || Number.isNaN(kg)) return
    setSaving(true)
    try {
      await saveWeightLog(profileId, isoDate(new Date()), kg)
      setWeightInput('')
      onSaved()
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } finally {
      setSaving(false)
    }
  }

  if (logs.length === 0) {
    return (
      <Card>
        <SectionLabel>Poids</SectionLabel>
        <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Aucune pesée enregistrée pour l'instant.</p>
        <div className="flex items-center gap-3">
          <input type="text" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="Ex: 65,0"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
          <button onClick={handleSave} disabled={saving || !weightInput.trim()}
            className="btn-press px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: '#F2C400', color: '#0E0E0D' }}>
            {saving ? '…' : 'Enregistrer'}
          </button>
        </div>
      </Card>
    )
  }

  const current = logs[logs.length - 1].weight_kg
  const first = logs[0].weight_kg
  const diff = +(current - first).toFixed(1)

  const W = 300, H = 76
  const minW = Math.min(...logs.map(d => d.weight_kg)) - 0.8
  const maxW = Math.max(...logs.map(d => d.weight_kg)) + 0.5
  const range = maxW - minW || 1
  const px = (i: number) => logs.length > 1 ? (i / (logs.length - 1)) * W : W / 2
  const py = (w: number) => H - 4 - ((w - minW) / range) * (H - 12)
  const pts = logs.map((d, i) => `${px(i).toFixed(1)},${py(d.weight_kg).toFixed(1)}`).join(' ')
  const area = `0,${H} ${pts} ${W},${H}`
  const lastX = px(logs.length - 1)
  const lastY = py(current)

  return (
    <Card className="!p-0 overflow-hidden card-lift">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <SectionLabel>Poids</SectionLabel>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <p className="text-4xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{current}</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-2)' }}>kg</p>
            </div>
          </div>
          {logs.length > 1 && (
            <span className="text-sm font-bold mt-1" style={{ color: diff >= 0 ? '#E4574A' : '#3D9E4A' }}>
              {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)} kg
            </span>
          )}
        </div>

        <div ref={chartRef} style={{ height: H }}>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F2C400" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#F2C400" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#weightGrad)" style={{ opacity: chartVisible ? 1 : 0, transition: 'opacity 0.6s ease 0.2s' }} />
            <polyline points={pts} fill="none" stroke="#F2C400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: chartVisible ? 'none' : `${W * 3} ${W * 3}`,
                strokeDashoffset: chartVisible ? 0 : W * 3,
                transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
              }} />
            <circle cx={lastX} cy={lastY} r="4.5" fill="#F2C400"
              style={{
                opacity: chartVisible ? 1 : 0,
                transform: `scale(${chartVisible ? 1 : 0})`,
                transformOrigin: `${lastX}px ${lastY}px`,
                transition: 'opacity 0.3s ease 0.9s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.9s',
              }} />
            <text x="2" y={py(first) - 6} fontSize="9" fill="var(--text-2)" fontFamily="Inter">{first} kg</text>
            <text x={W - 2} y={py(current) - 6} fontSize="9" fill="#F2C400" fontFamily="Inter" textAnchor="end">{current} kg</text>
          </svg>
        </div>

        {logs.length > 1 && (
          <p className="text-xs mt-2 mb-4" style={{ color: 'var(--text-2)' }}>
            {diff >= 0 ? '+' : ''}{diff} kg depuis la première pesée.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4 mt-4">
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Date</p>
            <div className="px-3 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
              {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Poids (KG)</p>
            <input type="text" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder={`${current}`}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={{ background: 'var(--input-bg)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button onClick={handleSave} disabled={saving || !weightInput.trim()}
          className="btn-press w-full py-3 rounded-2xl text-sm font-bold disabled:opacity-50"
          style={{ background: saved ? '#3D9E4A' : '#F2C400', color: '#0E0E0D', transition: 'background 0.35s var(--ease-out)' }}>
          {saved ? 'Enregistré ✓' : saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Card>
  )
}
