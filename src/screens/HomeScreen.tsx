import { useState, useEffect, useRef } from 'react'
import { Card, SectionLabel } from '../components/ui'
import { useApp } from '../context/AppContext'
import WeeklyRecapModal from '../components/WeeklyRecapModal'
import AddSessionSheet, { type SessionData } from '../components/AddSessionSheet'
import { useQuery } from '../lib/useQuery'
import { fetchAthleteSessions, validateSession, logFreeSession, type AthleteSession } from '../lib/queries/sessions'
import { fetchTodayCheckin, saveCheckin, type DailyCheckin } from '../lib/queries/checkins'
import { fetchAthleteWeekStats } from '../lib/queries/stats'

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

// ── Weight + distribution data ────────────────────────────────────────────

const WEIGHT_HISTORY = [
  { label: '3 août', w: 50.2 },
  { label: '4 août', w: 51.0 },
  { label: '5 août', w: 51.5 },
  { label: '7 août', w: 52.8 },
  { label: '8 août', w: 53.4 },
  { label: '9 août', w: 54.6 },
  { label: '10 août', w: 55.0 },
]

const DISCIPLINES = [
  { label: 'Course à pied', pct: 56, sessions: 5, color: '#F2C400' },
  { label: 'Vélo', pct: 11, sessions: 1, color: '#5B91D8' },
  { label: 'Natation', pct: 11, sessions: 1, color: '#7B6FD6' },
  { label: 'Musculation', pct: 22, sessions: 2, color: '#E4574A' },
]

// ── Data ──────────────────────────────────────────────────────────────────

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_DATES = [4, 5, 6, 7, 8, 9, 10]
const DAY_STATUS: Array<'done' | 'rest' | 'todo' | null> = ['done', 'done', 'rest', 'done', 'todo', null, null]
const STATUS_COLOR = { done: '#5EBA65', rest: 'var(--text-2)', todo: '#F2C400' }

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
  const [selectedDay, setSelectedDay] = useState(4)
  const [form, setForm] = useState<Record<FormKey, number>>({ sleep: 6, motivation: 8, fatigue: 4, soreness: 2, stress: 4 })
  const [formSent, setFormSent] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [showAddSession, setShowAddSession] = useState(false)
  const [validating, setValidating] = useState(false)

  const today = new Date()
  const todayIso = isoDate(today)
  const tomorrowIso = isoDate(new Date(today.getTime() + 24 * 3600 * 1000))
  const weekStart = isoDate(startOfWeek(today))
  const weekEnd = isoDate(new Date(startOfWeek(today).getTime() + 7 * 24 * 3600 * 1000))

  const { data: todaySessions, refetch: refetchToday } = useQuery<AthleteSession[]>(
    () => (profile ? fetchAthleteSessions(profile.id, todayIso, tomorrowIso) : Promise.resolve([])),
    [profile?.id, todayIso],
  )
  const todaySession = todaySessions?.[0] ?? null

  const { data: weekStats } = useQuery(
    () => (profile ? fetchAthleteWeekStats(profile.id, weekStart, weekEnd) : Promise.resolve(null)),
    [profile?.id, weekStart],
  )

  useQuery<DailyCheckin | null>(
    () => (profile ? fetchTodayCheckin(profile.id, todayIso).then((c) => { if (c) setForm(c); return c }) : Promise.resolve(null)),
    [profile?.id, todayIso],
  )

  async function handleValidateSession() {
    if (!profile || !todaySession) return
    setValidating(true)
    try {
      await validateSession(todaySession.id, profile.id, null, '')
      await refetchToday()
    } finally {
      setValidating(false)
    }
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
      <div className="flex gap-1.5 overflow-x-auto">
        {DAYS.map((d, i) => {
          const isSelected = i === selectedDay
          const status = DAY_STATUS[i]
          return (
            <button key={i} onClick={() => setSelectedDay(i)}
              className="btn-press shrink-0 flex flex-col items-center gap-1.5 w-11 py-2.5 rounded-2xl"
              style={{
                background: isSelected ? '#F2C400' : 'var(--surface2)',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
              <span className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: isSelected ? '#0E0E0D' : 'var(--text-2)' }}>{d}</span>
              <span className="text-sm font-black"
                style={{ color: isSelected ? '#0E0E0D' : 'var(--text-1)' }}>{DAY_DATES[i]}</span>
              {status && <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: isSelected ? '#0E0E0D' : STATUS_COLOR[status] }} />}
            </button>
          )
        })}
      </div>
    </Card>
  )

  const isDone = todaySession?.completion?.status === 'done'
  const sessionCard = (
    <Card lift>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Séance du jour</SectionLabel>
        {todaySession && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: isDone ? 'rgba(94,186,101,0.15)' : 'rgba(242,196,0,0.15)', color: isDone ? '#5EBA65' : '#F2C400' }}>
            {isDone ? 'Faite' : 'À faire'}
          </span>
        )}
      </div>
      {!todaySession ? (
        <p className="text-sm py-4" style={{ color: 'var(--text-2)' }}>Aucune séance programmée aujourd&apos;hui.</p>
      ) : (
        <>
          <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{todaySession.title}</p>
          {todaySession.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{todaySession.description}</p>}
          <div className="flex gap-6 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Distance', value: todaySession.distance_km ? `${todaySession.distance_km} km` : '—' },
              { label: '%VMA', value: todaySession.vma_percent ? `${todaySession.vma_percent}%` : '—' },
              { label: 'Durée', value: todaySession.duration_min ? `${todaySession.duration_min} min` : '—' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-2)' }}>{s.label}</p>
                <p className="text-base font-black" style={{ color: 'var(--text-1)' }}>{s.value}</p>
              </div>
            ))}
          </div>
          {!isDone && (
            <button onClick={handleValidateSession} disabled={validating}
              className="btn-press w-full mt-4 rounded-[12px] py-3 text-sm font-bold bg-[#F2C400] text-[#0E0E0D] disabled:opacity-50">
              {validating ? 'Validation…' : 'Valider la séance'}
            </button>
          )}
        </>
      )}
    </Card>
  )

  const formCard = (
    <Card>
      <SectionLabel>Bilan de forme — Aujourd&apos;hui</SectionLabel>
      <div className="space-y-4">
        {FORM_FIELDS.map(({ key, label, icon, color }) => {
          const val = form[key]
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                {icon(color)}
              </div>
              <span className="text-sm w-24 shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
              <FormSegment value={val} onChange={(v) => setForm((p) => ({ ...p, [key]: v }))} color={color} />
              <span className="text-sm font-bold w-4 text-right shrink-0 tabular-nums" style={{ color }}>{val}</span>
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
            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>67 km · 5 séances · 5000m dans 47 j</p>
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
            <p className="text-base font-black" style={{ color: 'var(--text-1)' }}>Cross de Nantes</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>8 km · 26&apos;30&quot;</p>
            <div className="flex gap-1.5 mt-3">
              {[{ v: 18, l: 'J' }, { v: 4, l: 'H' }, { v: 23, l: 'M' }].map(({ v, l }) => (
                <div key={l} className="flex-1 rounded-xl py-2 text-center" style={{ background: 'var(--surface2)' }}>
                  <p className="text-xl font-black leading-none" style={{ color: '#E4574A' }}><AnimatedNumber target={v} /></p>
                  <p className="text-[8px] mt-1" style={{ color: 'var(--text-2)' }}>{l}</p>
                </div>
              ))}
            </div>
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
            <SectionLabel>Saison 2025–26</SectionLabel>
            <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-1)' }}><AnimatedNumber target={1247} /><span className="text-base font-medium ml-1" style={{ color: 'var(--text-2)' }}>km</span></p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: '#5EBA65' }}>+18% vs saison préc.</p>
          </div>
          <div className="card-gradient-yellow rounded-[20px] p-4 relative overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #F2C400, transparent)' }} />
            <SectionLabel>VMA actuelle</SectionLabel>
            <p className="text-3xl font-black leading-none" style={{ color: '#F2C400' }}>17.3<span className="text-base font-medium ml-1" style={{ color: 'var(--text-2)' }}>km/h</span></p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-2)' }}>Testé le 2 août</p>
          </div>
        </div>
        {formCard}
        <WeightCard />
        <RepartitionCard />
        <ACWRCard />
      </div>

      {/* ── Desktop: Strava-style layout ── */}
      <div className="hidden lg:block" style={{ background: 'var(--bg)' }}>
        <div className="max-w-[1320px] mx-auto px-4 py-6">
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '240px 1fr 300px' }}>

            {/* ════ LEFT PANEL — separate cards like Strava ════ */}
            <div className="space-y-3">

              {/* Card 1: Profile */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
                <div className="flex flex-col items-center px-5 pt-6 pb-5">
                  {/* Hexagonal avatar */}
                  <div className="relative mb-3">
                    <div className="w-20 h-20 flex items-center justify-center text-2xl font-black"
                      style={{
                        background: 'var(--avatar)',
                        color: 'var(--avatar-text)',
                        clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                      }}>
                      {initials}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#F2C400] flex items-center justify-center"
                      style={{ border: '2px solid var(--card)' }}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4.5 7.5L8.5 3" stroke="#0E0E0D" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[17px] font-black leading-tight text-center" style={{ color: 'var(--text-1)' }}>
                    {athleteName}
                  </p>
                  {/* Stats row */}
                  <div className="flex w-full mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    {[
                      { label: 'Séances', value: `${weekStats?.sessionsDone ?? 0}/${weekStats?.sessionsPlanned ?? 0}` },
                      { label: 'km / sem.', value: `${Math.round(weekStats?.kmDone ?? 0)}` },
                    ].map((s, i) => (
                      <div key={s.label} className="flex-1 text-center relative">
                        {i > 0 && <div className="absolute left-0 top-1 bottom-1 w-px" style={{ background: 'var(--border)' }} />}
                        <p className="text-lg font-black leading-none" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-2)' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Dernière activité + Série */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
                <div className="px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-2)' }}>Dernière activité</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Endurance fondamentale</p>
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>9 août 2026 · 14,5 km · 5&apos;10&quot;/km</p>
                </div>
                <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>Votre série d&apos;activités</p>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#F2C400] text-[#0E0E0D]">25 sem.</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'].map((d, i) => {
                      const status = DAY_STATUS[i]
                      const isToday = i === selectedDay
                      return (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className="text-[9px] font-medium" style={{ color: 'var(--text-2)' }}>{d}</span>
                          <button onClick={() => setSelectedDay(i)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                            style={{
                              background: isToday ? '#F2C400' : status === 'done' ? 'rgba(94,186,101,0.18)' : 'var(--surface2)',
                              color: isToday ? '#0E0E0D' : status === 'done' ? '#5EBA65' : 'var(--text-2)',
                            }}>
                            {DAY_DATES[i]}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Card 3: Journal link */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
                <button className="btn-press w-full flex items-center justify-between px-5 py-3 text-sm font-semibold"
                  style={{ color: 'var(--text-1)', background: 'transparent' }}>
                  <span>Votre journal d&apos;entraînement</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Card 4: Sport icons */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', padding: '16px' }}>
                <div className="flex items-center justify-around">
                  {[
                    { label: 'Course', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 16L8 10L11 13L14 8L17 11" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="16" cy="5" r="2" stroke="var(--text-2)" strokeWidth="1.3" /></svg>, active: true },
                    { label: 'Vélo', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="6" cy="14" r="4" stroke="var(--text-2)" strokeWidth="1.3" /><circle cx="16" cy="14" r="4" stroke="var(--text-2)" strokeWidth="1.3" /><path d="M16 14L13 8H9L6 14M13 8L16 10" stroke="var(--text-2)" strokeWidth="1.3" strokeLinecap="round" /></svg>, active: false },
                    { label: 'Natation', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 13C5 11 8 15 11 13C14 11 17 15 19 13M3 17C5 15 8 19 11 17C14 15 17 19 19 17" stroke="var(--text-2)" strokeWidth="1.3" strokeLinecap="round" /><circle cx="15" cy="6" r="2" stroke="var(--text-2)" strokeWidth="1.3" /></svg>, active: false },
                    { label: 'Muscu', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 11H5M17 11H19M5 11V8H8V14H5V11ZM17 11V8H14V14H17V11ZM8 11H14" stroke="var(--text-2)" strokeWidth="1.3" strokeLinecap="round" /></svg>, active: false },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: s.active ? 'rgba(242,196,0,0.12)' : 'var(--surface2)' }}>
                        {s.icon}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5: ACWR effort widget */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', padding: '16px' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Effort relatif</p>
                </div>
                <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-1)' }}>
                  1.11
                  <span className="text-base font-medium ml-1" style={{ color: '#3D9E4A' }}>Zone optimale</span>
                </p>
                <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-2)' }}>Charge aiguë / chronique · ACWR</p>
                <ProgressBar pct={74} color="#3D9E4A" />
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>Cette semaine</p>
                  <div className="flex items-end gap-1.5" style={{ height: 40 }}>
                    {[62, 78, 55, 84, 70].map((v, i) => (
                      <div key={i} className="flex-1 rounded-t-sm"
                        style={{ height: `${v}%`, background: i === 4 ? '#F2C400' : 'var(--surface3)', transition: `height 0.6s ease ${i * 80}ms` }} />
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {['L', 'M', 'M', 'J', 'V'].map((d, i) => (
                      <div key={i} className="flex-1 text-center text-[9px]" style={{ color: 'var(--text-2)' }}>{d}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

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
                        {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  {todaySession && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: isDone ? 'rgba(94,186,101,0.12)' : 'rgba(242,196,0,0.12)', color: isDone ? '#5EBA65' : '#F2C400', border: `1px solid ${isDone ? 'rgba(94,186,101,0.2)' : 'rgba(242,196,0,0.2)'}` }}>
                      {isDone ? 'FAITE' : 'PLANIFIÉE'}
                    </span>
                  )}
                </div>

                {!todaySession ? (
                  <p className="px-4 pb-5 text-sm" style={{ color: 'var(--text-2)' }}>Aucune séance programmée aujourd&apos;hui.</p>
                ) : (
                  <>
                    {/* Activity title */}
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 12L7 6L9.5 9L11.5 6L13.5 8" stroke="var(--text-2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="4" r="1.8" stroke="var(--text-2)" strokeWidth="1.2" />
                        </svg>
                        <p className="text-xl font-black" style={{ color: 'var(--text-1)' }}>{todaySession.title}</p>
                      </div>
                      {todaySession.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{todaySession.description}</p>}
                    </div>

                    {/* Stats row */}
                    <div className="px-4 pb-4 flex items-center gap-10">
                      {[
                        { label: 'Distance', value: todaySession.distance_km ? `${todaySession.distance_km} km` : '—' },
                        { label: 'Durée est.', value: todaySession.duration_min ? `${todaySession.duration_min} min` : '—' },
                        { label: 'Intensité', value: todaySession.vma_percent ? `VMA ${todaySession.vma_percent}%` : '—', accent: true },
                      ].map((s) => (
                        <div key={s.label}>
                          <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-2)' }}>{s.label}</p>
                          <p className="text-[17px] font-black" style={{ color: s.accent ? '#F2C400' : 'var(--text-1)' }}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action bar */}
                    {!isDone && (
                      <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <button onClick={handleValidateSession} disabled={validating}
                          className="btn-press flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#F2C400] text-[#0E0E0D] disabled:opacity-50">
                          {validating ? 'Validation…' : 'Valider la séance'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Le fil d'activités passées (façon Strava) arrive avec l'intégration Strava, phase suivante */}

              <WeightCard />
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
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: 'Élite', bg: '#F2C400', c: '#0E0E0D' },
                    { label: 'CP', bg: '#5B91D8', c: '#fff' },
                    { label: 'Semi', bg: '#5EBA65', c: '#fff' },
                    { label: 'Trail', bg: '#7B6FD6', c: '#fff' },
                    { label: 'Mast.', bg: '#E4574A', c: '#fff' },
                    { label: 'ESA', bg: '#3D9E4A', c: '#fff' },
                    { label: 'Club', bg: 'var(--surface3)', c: 'var(--text-1)' },
                    { label: '+5', bg: 'var(--surface2)', c: 'var(--text-2)' },
                  ].map((g) => (
                    <button key={g.label} className="btn-press aspect-square rounded-xl flex items-center justify-center text-[10px] font-black"
                      style={{ background: g.bg, color: g.c }}>
                      {g.label}
                    </button>
                  ))}
                </div>
                <button className="btn-press w-full py-2 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                  Voir tous les groupes
                </button>
              </div>

              {/* Countdown */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-2)' }}>Prochaine compétition</p>
                <p className="text-lg font-black" style={{ color: 'var(--text-1)' }}>Cross de Nantes</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>8 km · 28 août 2026 · Objectif : 26&apos;30&quot;</p>
                <div className="flex gap-2">
                  {[{ v: 18, l: 'JOURS' }, { v: 4, l: 'HRS' }, { v: 23, l: 'MIN' }].map(({ v, l }) => (
                    <div key={l} className="flex-1 rounded-xl py-3 text-center" style={{ background: 'var(--surface2)' }}>
                      <p className="text-2xl font-black leading-none" style={{ color: '#F2C400' }}><AnimatedNumber target={v} /></p>
                      <p className="text-[8px] tracking-widest mt-1 font-semibold" style={{ color: 'var(--text-2)' }}>{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions d'athlètes */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
                <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>Suggestions d&apos;athlètes</p>
                {[
                  { initials: 'LB', name: 'Lucas Bernard', detail: 'Même groupe · Élite' },
                  { initials: 'SM', name: 'Sophie Martin', detail: 'Club Paris Athlétisme' },
                  { initials: 'AR', name: 'Antoine Roux', detail: 'Cross regional 2026' },
                ].map((a) => (
                  <div key={a.name} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: 'var(--avatar)', color: 'var(--avatar-text)' }}>{a.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-2)' }}>{a.detail}</p>
                    </div>
                    <button className="btn-press shrink-0 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ border: '1px solid #F2C400', color: '#F2C400', background: 'transparent' }}>
                      Suivre
                    </button>
                  </div>
                ))}
              </div>

              {/* Form bilan compact */}
              {formCard}
            </div>
          </div>
        </div>
      </div>

      {showRecap && <WeeklyRecapModal onClose={() => setShowRecap(false)} />}
      {showAddSession && <AddSessionSheet onClose={() => setShowAddSession(false)} onSave={handleLogFreeSession} />}
    </div>
  )
}

// ── Weight Card ───────────────────────────────────────────────────────────

function WeightCard() {
  const [weightInput, setWeightInput] = useState('55,0')
  const [saved, setSaved] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartVisible, setChartVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setChartVisible(true) }, { threshold: 0.15 })
    if (chartRef.current) obs.observe(chartRef.current)
    return () => obs.disconnect()
  }, [])

  const current = WEIGHT_HISTORY[WEIGHT_HISTORY.length - 1].w
  const first = WEIGHT_HISTORY[0].w
  const diff = +(current - first).toFixed(1)

  const W = 300, H = 76
  const minW = Math.min(...WEIGHT_HISTORY.map(d => d.w)) - 0.8
  const maxW = Math.max(...WEIGHT_HISTORY.map(d => d.w)) + 0.5
  const px = (i: number) => (i / (WEIGHT_HISTORY.length - 1)) * W
  const py = (w: number) => H - 4 - ((w - minW) / (maxW - minW)) * (H - 12)
  const pts = WEIGHT_HISTORY.map((d, i) => `${px(i).toFixed(1)},${py(d.w).toFixed(1)}`).join(' ')
  const area = `0,${H} ${pts} ${W},${H}`
  const lastX = px(WEIGHT_HISTORY.length - 1)
  const lastY = py(WEIGHT_HISTORY[WEIGHT_HISTORY.length - 1].w)

  return (
    <Card className="!p-0 overflow-hidden card-lift">
      <div className="px-5 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <SectionLabel>Poids</SectionLabel>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <p className="text-4xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{current}</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-2)' }}>kg</p>
            </div>
          </div>
          <span className="text-sm font-bold mt-1"
            style={{ color: diff >= 0 ? '#E4574A' : '#3D9E4A' }}>
            {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)} kg / sem.
          </span>
        </div>

        {/* Animated line chart */}
        <div ref={chartRef} style={{ height: H }}>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F2C400" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#F2C400" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#weightGrad)"
              style={{
                opacity: chartVisible ? 1 : 0,
                transition: 'opacity 0.6s ease 0.2s',
              }} />
            <polyline points={pts} fill="none" stroke="#F2C400" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
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
            {/* First/last labels */}
            <text x="2" y={py(first) - 6} fontSize="9" fill="var(--text-2)" fontFamily="Inter">
              {first} kg
            </text>
            <text x={W - 2} y={py(current) - 6} fontSize="9" fill="#F2C400" fontFamily="Inter" textAnchor="end">
              {current} kg
            </text>
          </svg>
        </div>

        <p className="text-xs mt-2 mb-4" style={{ color: 'var(--text-2)' }}>
          {diff >= 0 ? '+' : ''}{diff} kg depuis la première pesée.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Date</p>
            <div className="px-3 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
              10 août 2026
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Poids (KG)</p>
            <input type="text" value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={{ background: 'var(--input-bg)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="px-5 pb-5">
        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200) }}
          className="btn-press w-full py-3 rounded-2xl text-sm font-bold"
          style={{
            background: saved ? '#3D9E4A' : '#F2C400',
            color: '#0E0E0D',
            transition: 'background 0.35s var(--ease-out)',
          }}>
          {saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      </div>
    </Card>
  )
}

// ── Répartition Card ──────────────────────────────────────────────────────

function RepartitionCard() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const size = 164
  const r = 58
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const totalSessions = DISCIPLINES.reduce((s, d) => s + d.sessions, 0)
  const gapPx = 4

  let acc = 0
  const segments = DISCIPLINES.map((d) => {
    const dash = (d.pct / 100) * circ
    const seg = { ...d, dash: Math.max(dash - gapPx, 0), offset: acc }
    acc += dash
    return seg
  })

  return (
    <Card>
      <SectionLabel>Répartition des séances</SectionLabel>
      <p className="text-xs mt-0.5 mb-5" style={{ color: 'var(--text-2)' }}>Par discipline · 4 dernières semaines</p>

      <div ref={ref} className="flex items-center gap-5">
        {/* Donut */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface2)" strokeWidth={22} />
            {segments.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={s.color} strokeWidth={22}
                strokeDasharray={visible ? `${s.dash} ${circ - s.dash}` : `0 ${circ}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="round"
                style={{ transition: `stroke-dasharray 0.75s cubic-bezier(0.16, 1, 0.3, 1) ${i * 90}ms` }}
              />
            ))}
          </svg>
          <div className="absolute text-center pointer-events-none">
            <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{totalSessions}</p>
            <p className="text-[9px] mt-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>séances</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {DISCIPLINES.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <p className="text-xs flex-1 truncate" style={{ color: 'var(--text-2)' }}>{d.label}</p>
              <p className="text-xs font-black tabular-nums" style={{ color: 'var(--text-1)' }}>{d.pct}%</p>
              <p className="text-xs tabular-nums w-4 text-right" style={{ color: 'var(--text-2)' }}>{d.sessions}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ── ACWR Card ─────────────────────────────────────────────────────────────

function ACWRCard() {
  const acuteLoad = 420
  const chronicLoad = 380
  const acwr = acuteLoad / chronicLoad

  const zoneColor = acwr < 0.8 ? '#4278C4' : acwr < 1.3 ? '#3D9E4A' : acwr < 1.5 ? '#F2C400' : '#C94040'
  const zoneLabel = acwr < 0.8 ? 'Sous-charge' : acwr < 1.3 ? 'Zone optimale' : acwr < 1.5 ? 'Zone de risque' : 'Surcharge'

  const weeks = [
    { label: 'S−4', acute: 310, chronic: 340 },
    { label: 'S−3', acute: 350, chronic: 345 },
    { label: 'S−2', acute: 390, chronic: 360 },
    { label: 'S−1', acute: 400, chronic: 370 },
    { label: 'Sem.', acute: acuteLoad, chronic: chronicLoad },
  ]
  const maxVal = Math.max(...weeks.flatMap((w) => [w.acute, w.chronic]))
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Charge d&apos;entraînement — ACWR</SectionLabel>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${zoneColor}18`, color: zoneColor }}>{zoneLabel}</span>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div>
          <p className="text-4xl font-black leading-none" style={{ color: zoneColor }}>{acwr.toFixed(2)}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-2)' }}>Ratio aiguë / chronique</p>
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-2)' }}>
              <span>Aiguë (7j)</span>
              <span className="font-bold" style={{ color: 'var(--text-1)' }}>{acuteLoad} UA</span>
            </div>
            <ProgressBar pct={(acuteLoad / maxVal) * 100} color="#F2C400" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-2)' }}>
              <span>Chronique (28j)</span>
              <span className="font-bold" style={{ color: 'var(--text-1)' }}>{chronicLoad} UA</span>
            </div>
            <ProgressBar pct={(chronicLoad / maxVal) * 100} color="var(--text-2)" />
          </div>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div ref={ref} className="flex items-end gap-1.5 mb-3" style={{ height: 56 }}>
        {weeks.map((w, i) => {
          const isCurrent = i === weeks.length - 1
          const targetH = Math.round((w.acute / maxVal) * 44)
          const ratio = w.acute / w.chronic
          const col = ratio < 0.8 ? '#4278C4' : ratio < 1.3 ? '#3D9E4A' : ratio < 1.5 ? '#F2C400' : '#C94040'
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ height: 56 }}>
              <div className="w-full flex items-end" style={{ height: 44 }}>
                <div className="w-full rounded-t-sm"
                  style={{
                    height: visible ? targetH : 0,
                    background: isCurrent ? col : 'var(--surface3)',
                    border: isCurrent ? `1px solid ${col}` : 'none',
                    transition: `height 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms`,
                  }} />
              </div>
              <span className="text-[9px]" style={{ color: isCurrent ? 'var(--text-1)' : 'var(--text-2)' }}>{w.label}</span>
            </div>
          )
        })}
      </div>

      {/* Zone guide */}
      <div className="pt-3 grid grid-cols-4 gap-1.5" style={{ borderTop: '1px solid var(--border)' }}>
        {[
          { label: '< 0.8', desc: 'Sous-charge', color: '#4278C4' },
          { label: '0.8–1.3', desc: 'Optimal', color: '#3D9E4A' },
          { label: '1.3–1.5', desc: 'Risque', color: '#F2C400' },
          { label: '> 1.5', desc: 'Danger', color: '#C94040' },
        ].map((z) => (
          <div key={z.label} className="text-center">
            <div className="h-1 rounded-full mb-1" style={{ background: z.color }} />
            <p className="text-[8px] font-bold" style={{ color: z.color }}>{z.label}</p>
            <p className="text-[8px]" style={{ color: 'var(--text-2)' }}>{z.desc}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
