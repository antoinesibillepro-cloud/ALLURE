import { useState } from 'react'
import { Card, SectionLabel } from '../components/ui'
import AddSessionSheet, { type SessionData } from '../components/AddSessionSheet'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchAthleteSessions, validateSession, logFreeSession, type AthleteSession } from '../lib/queries/sessions'

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

// ── data ─────────────────────────────────────────────────────────────────────
type Chip = { id: string; label: string; done: boolean; description: string | null; sessionId: string | null }

type CompEntry = { name: string; date: string; type: string; daysLeft: number }
const COMPETITIONS: CompEntry[] = [
  { name: '5000 m', date: '26 sept · 14:30', type: 'course', daysLeft: 47 },
]

type CrossEntry = { date: string; dist: string; dur: string }
const CROSS: Record<string, CrossEntry[]> = {
  vélo: [
    { date: '7 août',   dist: '25 km', dur: '60 min' },
    { date: '30 juil.', dist: '3,38 km', dur: '10 min' },
    { date: '30 juil.', dist: '3,98 km', dur: '12 min' },
    { date: '29 juil.', dist: '3,91 km', dur: '12 min' },
    { date: '28 juil.', dist: '5,42 km', dur: '16 min' },
    { date: '28 juil.', dist: '5,14 km', dur: '12 min' },
    { date: '27 juil.', dist: '2,87 km', dur: '8 min' },
    { date: '27 juil.', dist: '3,95 km', dur: '12 min' },
  ],
  natation: [
    { date: '5 août',   dist: '2000 m', dur: '45 min' },
    { date: '30 juil.', dist: '1500 m', dur: '34 min' },
    { date: '27 juil.', dist: '1800 m', dur: '40 min' },
  ],
  abdos: [
    { date: '4 août',   dist: '—', dur: '25 min' },
    { date: '29 juil.', dist: '—', dur: '20 min' },
    { date: '25 juil.', dist: '—', dur: '30 min' },
  ],
}

const VELO_CHART = [0, 3.38, 3.98, 3.91, 5.42, 5.14, 2.87, 3.95]
const NATA_CHART = [0, 1.5, 1.8, 2.0]
const ABDOS_CHART = [25, 20, 30]

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

type MuscGroup = { title: string; exercises: string[] }
const MUSC_GROUPS: MuscGroup[] = [
  { title: 'HAUT DU CORPS', exercises: ['Développé couché', 'Tirage menton', 'Tirage tête', 'Développé nuque', 'Rowing'] },
  { title: 'HALTÉROPHILIE', exercises: ['Épaulé', 'Épaulé-jeté', 'Épaulé-jeté fente', 'Arraché', 'Arraché fente'] },
  { title: 'BAS DU CORPS',  exercises: ['Squat complet', 'Demi-squat', 'Presse à cuisses', 'Leg curl', 'Mollet barre guidée'] },
  { title: 'AUTRES',        exercises: ['Fentes marché', 'Fentes caisse', 'Fessiers'] },
]

// ── mini SVG area chart ───────────────────────────────────────────────────────
function AreaChart({ data, color }: { data: number[]; color: string }) {
  const W = 320, H = 80
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (W - 16) + 8,
    y: H - 12 - (v / max) * (H - 20),
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${H - 12} L${pts[0].x},${H - 12} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50].map(v => {
        const y = H - 12 - (v / (max * 1.1)) * (H - 20)
        return <line key={v} x1="8" x2={W - 8} y1={y} y2={y} stroke="var(--border)" strokeWidth="0.5" />
      })}
      <path d={area} fill="url(#ag)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
    </svg>
  )
}

// ── charges table ─────────────────────────────────────────────────────────────
function ChargesTable({ exercise, maxKg }: { exercise: string; maxKg: number }) {
  const rows = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50, 40, 30]
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="px-4 py-3" style={{ background: 'var(--surface2)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Charges — {exercise}</p>
      </div>
      <div className="grid grid-cols-2 px-4 py-2 border-b text-[10px] font-bold uppercase tracking-wider"
        style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
        <span>% du max</span><span className="text-right">Charge</span>
      </div>
      {rows.map((pct) => {
        const kg = Math.round((pct / 100) * maxKg * 2) / 2
        return (
          <div key={pct} className="grid grid-cols-2 px-4 py-2.5 border-b last:border-b-0"
            style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>{pct} %</span>
            <span className="text-sm font-semibold text-right" style={{ color: 'var(--text-1)' }}>{kg} kg</span>
          </div>
        )
      })}
      <p className="px-4 py-2 text-[10px] italic" style={{ color: 'var(--text-2)' }}>
        Charges arrondies au 2,5 kg le plus proche (disques standard).
      </p>
    </div>
  )
}

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
  const [selectedDay, setSelectedDay] = useState(now.getDate())
  const [crossTab, setCrossTab] = useState<'vélo' | 'natation' | 'abdos'>('vélo')
  const [perfTab, setPerfTab] = useState<'allures' | 'musculation'>('allures')
  const [compTab, setCompTab] = useState<'comp' | 'obj'>('comp')
  const [vma, setVma] = useState(21)
  const [muscKg, setMuscKg] = useState<Record<string, number>>({ 'Fentes caisse': 20, 'Fessiers': 50 })
  const [activeExercise, setActiveExercise] = useState<string | null>('Fessiers')
  const [showAddSession, setShowAddSession] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)

  const { data: monthSessions, refetch: refetchMonth } = useQuery<AthleteSession[]>(
    () => (profile ? fetchAthleteSessions(profile.id, isoDate(monthStart), isoDate(monthEnd)) : Promise.resolve([])),
    [profile?.id, MONTH_LABEL],
  )

  const dayChips: Record<number, Chip[]> = {}
  for (const s of monthSessions ?? []) {
    const day = new Date(s.scheduled_at).getDate()
    dayChips[day] = dayChips[day] ?? []
    dayChips[day].push({ id: s.id, label: s.title, done: s.completion?.status === 'done', description: s.description, sessionId: s.id })
  }

  async function handleValidate(sessionId: string) {
    if (!profile) return
    setValidatingId(sessionId)
    try {
      await validateSession(sessionId, profile.id, null, '')
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

  const chartData = crossTab === 'vélo' ? VELO_CHART : crossTab === 'natation' ? NATA_CHART : ABDOS_CHART
  const chartColor = crossTab === 'vélo' ? '#F2C400' : crossTab === 'natation' ? '#5B91D8' : '#E4574A'

  const addLabel = { vélo: 'Ajouter une séance vélo', natation: 'Ajouter une séance natation', abdos: 'Ajouter une séance abdos' }[crossTab]

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Entraînements</h1>
        <button className="flex items-center gap-2 text-white text-xs font-bold px-3.5 py-2 rounded-2xl"
          style={{ background: '#FC5200' }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.5 4.5H11L8 6.5L9.5 10.5L6 8L2.5 10.5L4 6.5L1 4.5H4.5L6 1Z" fill="white" />
          </svg>
          Synchroniser →
        </button>
      </div>

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
                      style={{ background: c.done ? 'rgba(94,186,101,0.18)' : 'rgba(242,196,0,0.18)', color: c.done ? '#5EBA65' : '#D4AB00' }}>
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
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: c.done ? '#5EBA65' : '#F2C400' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{c.label}</span>
                </div>
                {c.done ? (
                  <span className="text-xs font-semibold text-[#5EBA65]">✓ Réalisée</span>
                ) : (
                  <button disabled={validatingId === c.sessionId} onClick={() => c.sessionId && handleValidate(c.sessionId)}
                    className="text-xs font-bold px-3 py-1 rounded-full text-[#0E0E0D] disabled:opacity-50" style={{ background: '#F2C400' }}>
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

      {/* ── Objectifs & Compétitions ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-sm">🏆</span>
          <SectionLabel>Objectifs & Compétitions</SectionLabel>
        </div>
        <Card>
          <div className="flex gap-1 mb-4 p-0.5 rounded-2xl w-fit" style={{ background: 'var(--surface2)' }}>
            {([
              { id: 'comp' as const, icon: '🏅', label: 'Compétitions (1)' },
              { id: 'obj' as const,  icon: '🎯', label: 'Objectifs (2)' },
            ]).map(t => (
              <button key={t.id} onClick={() => setCompTab(t.id)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: compTab === t.id ? 'var(--card)' : 'transparent',
                  color: compTab === t.id ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow: compTab === t.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {compTab === 'comp' ? (
            <>
              {COMPETITIONS.map((c, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0"
                    style={{ background: 'var(--surface2)', border: '2px solid #F2C400' }}>
                    <span className="text-[10px] font-black text-[#F2C400]">J{c.daysLeft}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-2)' }}>{c.date}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(94,186,101,0.15)', color: '#5EBA65' }}>{c.type}</span>
                  <button className="text-xs font-semibold text-[#E4574A]">supprimer</button>
                </div>
              ))}
              <button className="mt-3 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Ajouter une compétition
              </button>
            </>
          ) : (
            <>
              {[
                { label: 'Passer sous 14\'00 au 5000m', deadline: '26 sept', color: '#F2C400', done: false },
                { label: 'Courir 80 km/semaine', deadline: 'Fin saison', color: '#5B91D8', done: true },
              ].map((obj, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-5 h-5 rounded-full mt-0.5 flex items-center justify-center shrink-0"
                    style={{ background: obj.done ? 'rgba(94,186,101,0.2)' : obj.color + '22', border: `1.5px solid ${obj.done ? '#5EBA65' : obj.color}` }}>
                    {obj.done && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#5EBA65" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: obj.done ? 'var(--text-2)' : 'var(--text-1)', textDecoration: obj.done ? 'line-through' : 'none' }}>{obj.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Échéance : {obj.deadline}</p>
                  </div>
                </div>
              ))}
              <button className="mt-3 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Ajouter un objectif
              </button>
            </>
          )}
        </Card>
      </div>

      {/* ── Croisé ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-sm">⚡</span>
          <SectionLabel>Croisé</SectionLabel>
        </div>
        <Card>
          <div className="flex gap-1 mb-4 p-0.5 rounded-2xl w-fit" style={{ background: 'var(--surface2)' }}>
            {([
              { id: 'vélo' as const,     icon: '🚴', label: 'Vélo' },
              { id: 'natation' as const, icon: '🏊', label: 'Natation' },
              { id: 'abdos' as const,    icon: '💪', label: 'Abdos' },
            ]).map((t) => (
              <button key={t.id} onClick={() => setCrossTab(t.id)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: crossTab === t.id ? 'var(--card)' : 'transparent',
                  color: crossTab === t.id ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow: crossTab === t.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-0">
            {CROSS[crossTab].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>{item.date}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                  {item.dist !== '—' ? item.dist + ' · ' : ''}{item.dur}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <AreaChart data={chartData} color={chartColor} />
          </div>

          <button className="mt-3 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            {addLabel}
          </button>
        </Card>
      </div>

      {/* ── Performance ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-sm">🏃</span>
          <SectionLabel>Performance</SectionLabel>
        </div>
        <Card>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-0.5 rounded-2xl w-fit" style={{ background: 'var(--surface2)' }}>
            {([
              { id: 'allures' as const,     icon: '🏃', label: 'Allures' },
              { id: 'musculation' as const, icon: '💪', label: 'Musculation' },
            ]).map((t) => (
              <button key={t.id} onClick={() => setPerfTab(t.id)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: perfTab === t.id ? 'var(--card)' : 'transparent',
                  color: perfTab === t.id ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow: perfTab === t.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {perfTab === 'allures' ? (
            <>
              {/* VMA stepper */}
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>VMA (modifiable)</p>
              <div className="flex items-center gap-4 mb-1">
                <button onClick={() => setVma(v => Math.max(10, v - 0.5))}
                  className="w-9 h-9 rounded-xl text-lg font-bold flex items-center justify-center transition-all active:scale-95"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>−</button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-black" style={{ color: 'var(--text-1)' }}>{vma}</span>
                  <span className="text-sm font-semibold ml-1.5" style={{ color: 'var(--text-2)' }}>km/h</span>
                </div>
                <button onClick={() => setVma(v => Math.min(30, v + 0.5))}
                  className="w-9 h-9 rounded-xl text-lg font-bold flex items-center justify-center transition-all active:scale-95"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>+</button>
              </div>
              <button className="text-xs font-semibold text-[#F2C400] flex items-center gap-1 mb-5">
                🥇 Voir la fiche FFA →
              </button>

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
            </>
          ) : (
            <>
              {/* Musculation groups */}
              {MUSC_GROUPS.map((group) => (
                <div key={group.title} className="mb-5 last:mb-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>{group.title}</p>
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {group.exercises.map((ex, i) => {
                      const kg = muscKg[ex]
                      const isActive = activeExercise === ex
                      return (
                        <div key={ex}>
                          <div className="flex items-center px-4 py-3 border-b last:border-b-0 transition-colors cursor-pointer"
                            style={{ borderColor: 'var(--border)', background: isActive ? 'rgba(242,196,0,0.06)' : 'transparent' }}
                            onClick={() => setActiveExercise(isActive ? null : ex)}>
                            <span className="flex-1 text-sm font-semibold" style={{ color: isActive ? '#F2C400' : 'var(--text-1)' }}>{ex}</span>
                            {kg !== undefined ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={kg}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => setMuscKg(prev => ({ ...prev, [ex]: Number(e.target.value) }))}
                                  className="w-16 text-right text-sm font-bold rounded-lg px-2 py-1 outline-none"
                                  style={{ background: 'var(--surface2)', color: '#F2C400', border: 'none' }}
                                />
                                <span className="text-xs" style={{ color: 'var(--text-2)' }}>kg</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>—</span>
                                <span className="text-xs" style={{ color: 'var(--text-2)' }}>kg</span>
                                <button onClick={e => { e.stopPropagation(); setMuscKg(prev => ({ ...prev, [ex]: 60 })) }}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>Saisir</button>
                              </div>
                            )}
                          </div>
                          {isActive && kg !== undefined && (
                            <div className="px-4 pb-4">
                              <ChargesTable exercise={ex} maxKg={kg} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>

      {showAddSession && (
        <AddSessionSheet
          date={new Date(now.getFullYear(), now.getMonth(), selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          onClose={() => setShowAddSession(false)}
          onSave={handleLogFreeSession}
        />
      )}
    </div>
  )
}
