import { useState } from 'react'
import { Card, SectionLabel } from '../components/ui'
import AddSessionSheet, { type SessionData } from '../components/AddSessionSheet'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchAthleteSessions, validateSession, logFreeSession, type AthleteSession } from '../lib/queries/sessions'
import { fetchStravaStatus, connectStrava, syncStrava, fetchStravaActivities, type StravaActivity } from '../lib/queries/strava'
import { fetchCompetitions, createCompetition, toggleCompetitionDone, deleteCompetition, updateVma, type Competition } from '../lib/queries/profileExtras'
import { fetchCrossTrainingLogs, createCrossTrainingLog, deleteCrossTrainingLog, type CrossTrainingLog, type Discipline } from '../lib/queries/crossTraining'

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
  const [newCrossDuration, setNewCrossDuration] = useState('')
  const [newCrossDistance, setNewCrossDistance] = useState('')
  const [newCrossNotes, setNewCrossNotes] = useState('')
  const [savingCross, setSavingCross] = useState(false)

  const { data: competitions, refetch: refetchCompetitions } = useQuery<Competition[]>(
    () => (profile ? fetchCompetitions(profile.id) : Promise.resolve([])),
    [profile?.id],
  )

  const { data: crossLogs, refetch: refetchCrossLogs } = useQuery<CrossTrainingLog[]>(
    () => (profile ? fetchCrossTrainingLogs(profile.id, crossTab) : Promise.resolve([])),
    [profile?.id, crossTab],
  )
  const { data: muscLogs, refetch: refetchMuscLogs } = useQuery<CrossTrainingLog[]>(
    () => (profile ? fetchCrossTrainingLogs(profile.id, 'musculation') : Promise.resolve([])),
    [profile?.id],
  )

  async function handleAddCross(discipline: Discipline, refetch: () => void) {
    if (!profile || !newCrossDuration.trim()) return
    setSavingCross(true)
    try {
      await createCrossTrainingLog(profile.id, {
        discipline,
        date: new Date().toISOString().slice(0, 10),
        duration_min: parseInt(newCrossDuration, 10),
        distance_km: newCrossDistance ? parseFloat(newCrossDistance) : null,
        rpe: null,
        notes: newCrossNotes || null,
      })
      setNewCrossDuration(''); setNewCrossDistance(''); setNewCrossNotes('')
      setShowAddCross(false)
      refetch()
    } finally {
      setSavingCross(false)
    }
  }

  async function handleDeleteCross(id: string, refetch: () => void) {
    await deleteCrossTrainingLog(id)
    refetch()
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
    () => (profile ? fetchStravaActivities(profile.id) : Promise.resolve([])),
    [profile?.id],
  )

  async function handleStravaButton() {
    if (!stravaStatus?.connected) {
      await connectStrava()
      return
    }
    setSyncing(true)
    try {
      await syncStrava()
      await Promise.all([refetchStravaActivities(), refetchStravaStatus()])
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
    dayChips[day].push({ id: s.id, label: s.title, done: s.completion?.status === 'done', description: s.description, sessionId: s.id })
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

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-8">

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
        <Card className="!p-4">
          <SectionLabel>Activités Strava récentes</SectionLabel>
          {!stravaActivities?.length ? (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucune activité synchronisée pour l'instant — clique sur Synchroniser.</p>
          ) : (
            <div className="space-y-2">
              {stravaActivities.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                      {new Date(a.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {a.type}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                    {(a.distance_m / 1000).toFixed(1)} km · {Math.round(a.moving_time_s / 60)} min
                  </p>
                </div>
              ))}
            </div>
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

          {showAddComp && (
            <div className="mb-4 p-3 rounded-xl space-y-2" style={{ background: 'var(--surface2)' }}>
              <input value={newCompTitle} onChange={(e) => setNewCompTitle(e.target.value)}
                placeholder={compTab === 'comp' ? 'Ex: 10km de Paris' : 'Ex: Passer sous 40min au 10km'}
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={newCompDate} onChange={(e) => setNewCompDate(e.target.value)}
                  className="rounded-[10px] px-2 py-2 text-xs outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                <input value={newCompDistance} onChange={(e) => setNewCompDistance(e.target.value)} placeholder="Distance km"
                  className="rounded-[10px] px-2 py-2 text-xs outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                <input value={newCompTarget} onChange={(e) => setNewCompTarget(e.target.value)} placeholder="Objectif chrono"
                  className="rounded-[10px] px-2 py-2 text-xs outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAddCompetition(compTab === 'comp' ? 'competition' : 'objective')}
                  disabled={savingComp || !newCompTitle.trim()}
                  className="text-xs font-bold px-3 py-1.5 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                  {savingComp ? '…' : 'Ajouter'}
                </button>
                <button onClick={() => setShowAddComp(false)} className="text-xs font-semibold px-3 py-1.5 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
              </div>
            </div>
          )}

          {compTab === 'comp' ? (
            <>
              {competitions?.filter((c) => c.kind === 'competition').length === 0 && !showAddComp && (
                <p className="text-sm py-3" style={{ color: 'var(--text-2)' }}>Aucune compétition programmée.</p>
              )}
              {competitions?.filter((c) => c.kind === 'competition').map((c) => {
                const daysLeft = c.event_date ? Math.max(0, Math.ceil((new Date(c.event_date).getTime() - now.getTime()) / 86400000)) : null
                return (
                  <div key={c.id} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0"
                      style={{ background: 'var(--surface2)', border: '2px solid #F2C400' }}>
                      <span className="text-[10px] font-black text-[#F2C400]">{daysLeft !== null ? `J${daysLeft}` : '—'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{c.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                        {c.event_date ? new Date(c.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                        {c.distance_km ? ` · ${c.distance_km} km` : ''}{c.target_time ? ` · ${c.target_time}` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCompetition(c.id)} className="text-xs font-semibold text-[#E4574A]">supprimer</button>
                  </div>
                )
              })}
              <button onClick={() => setShowAddComp(true)} className="mt-3 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Ajouter une compétition
              </button>
            </>
          ) : (
            <>
              {competitions?.filter((c) => c.kind === 'objective').length === 0 && !showAddComp && (
                <p className="text-sm py-3" style={{ color: 'var(--text-2)' }}>Aucun objectif pour l'instant.</p>
              )}
              {competitions?.filter((c) => c.kind === 'objective').map((obj) => (
                <div key={obj.id} className="flex items-start gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => handleToggleObjective(obj.id, !obj.done)}
                    className="w-5 h-5 rounded-full mt-0.5 flex items-center justify-center shrink-0"
                    style={{ background: obj.done ? 'rgba(94,186,101,0.2)' : 'rgba(242,196,0,0.15)', border: `1.5px solid ${obj.done ? '#5EBA65' : '#F2C400'}` }}>
                    {obj.done && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#5EBA65" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: obj.done ? 'var(--text-2)' : 'var(--text-1)', textDecoration: obj.done ? 'line-through' : 'none' }}>{obj.title}</p>
                    {obj.event_date && <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Échéance : {new Date(obj.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>}
                  </div>
                  <button onClick={() => handleDeleteCompetition(obj.id)} className="text-xs font-semibold text-[#E4574A] shrink-0">supprimer</button>
                </div>
              ))}
              <button onClick={() => setShowAddComp(true)} className="mt-3 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
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
              { id: 'velo' as const, icon: '🚴', label: 'Vélo' },
              { id: 'natation' as const, icon: '🏊', label: 'Natation' },
              { id: 'gainage' as const, icon: '🧘', label: 'Gainage' },
            ]).map((t) => (
              <button key={t.id} onClick={() => { setCrossTab(t.id); setShowAddCross(false) }}
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

          {showAddCross && (
            <div className="mb-4 p-3 rounded-xl space-y-2" style={{ background: 'var(--surface2)' }}>
              <div className="grid grid-cols-2 gap-2">
                <input value={newCrossDuration} onChange={(e) => setNewCrossDuration(e.target.value)} placeholder="Durée (min)" inputMode="numeric"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                <input value={newCrossDistance} onChange={(e) => setNewCrossDistance(e.target.value)} placeholder="Distance km (option.)"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              </div>
              <input value={newCrossNotes} onChange={(e) => setNewCrossNotes(e.target.value)} placeholder="Notes (optionnel)"
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              <div className="flex gap-2">
                <button onClick={() => handleAddCross(crossTab, refetchCrossLogs)} disabled={savingCross || !newCrossDuration.trim()}
                  className="text-xs font-bold px-3 py-1.5 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                  {savingCross ? '…' : 'Ajouter'}
                </button>
                <button onClick={() => setShowAddCross(false)} className="text-xs font-semibold px-3 py-1.5 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
              </div>
            </div>
          )}

          {!crossLogs?.length ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucune séance enregistrée.</p>
          ) : (
            <div className="space-y-0">
              {crossLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>{new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                    {log.distance_km ? `${log.distance_km} km · ` : ''}{log.duration_min} min
                  </span>
                  <button onClick={() => handleDeleteCross(log.id, refetchCrossLogs)} className="text-xs font-semibold text-[#E4574A]">×</button>
                </div>
              ))}
            </div>
          )}

          {!showAddCross && (
            <button onClick={() => setShowAddCross(true)} className="mt-3 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Ajouter une séance {crossTab === 'velo' ? 'vélo' : crossTab === 'natation' ? 'natation' : 'gainage'}
            </button>
          )}
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
            </>
          ) : (
            <>
              {showAddCross && (
                <div className="mb-4 p-3 rounded-xl space-y-2" style={{ background: 'var(--surface2)' }}>
                  <input value={newCrossDuration} onChange={(e) => setNewCrossDuration(e.target.value)} placeholder="Durée (min)" inputMode="numeric"
                    className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                  <input value={newCrossNotes} onChange={(e) => setNewCrossNotes(e.target.value)} placeholder="Notes (ex: Haut du corps, squat 60kg...)"
                    className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                  <div className="flex gap-2">
                    <button onClick={() => handleAddCross('musculation', refetchMuscLogs)} disabled={savingCross || !newCrossDuration.trim()}
                      className="text-xs font-bold px-3 py-1.5 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                      {savingCross ? '…' : 'Ajouter'}
                    </button>
                    <button onClick={() => setShowAddCross(false)} className="text-xs font-semibold px-3 py-1.5 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
                  </div>
                </div>
              )}
              {!muscLogs?.length ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucune séance de musculation enregistrée.</p>
              ) : (
                <div className="space-y-0">
                  {muscLogs.map((log) => (
                    <div key={log.id} className="py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          {new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {log.duration_min} min
                        </span>
                        <button onClick={() => handleDeleteCross(log.id, refetchMuscLogs)} className="text-xs font-semibold text-[#E4574A]">×</button>
                      </div>
                      {log.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{log.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              {!showAddCross && (
                <button onClick={() => setShowAddCross(true)} className="mt-3 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Ajouter une séance musculation
                </button>
              )}
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
