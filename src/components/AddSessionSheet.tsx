import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Sport = 'course' | 'velo' | 'natation' | 'muscu' | 'kine' | 'autre'

function IcCourse({ c }: { c: string }) {
  return <svg width="18" height="18" viewBox="0 0 14 14" fill="none"><path d="M1.5 7H4L5.5 4L8 10L9.5 7H12.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function IcVelo({ c }: { c: string }) {
  return <svg width="18" height="18" viewBox="0 0 22 22" fill="none"><circle cx="6" cy="14" r="4" stroke={c} strokeWidth="1.4" /><circle cx="16" cy="14" r="4" stroke={c} strokeWidth="1.4" /><path d="M16 14L13 8H9L6 14M13 8L16 10" stroke={c} strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function IcNatation({ c }: { c: string }) {
  return <svg width="18" height="18" viewBox="0 0 22 22" fill="none"><path d="M3 13C5 11 8 15 11 13C14 11 17 15 19 13M3 17C5 15 8 19 11 17C14 15 17 19 19 17" stroke={c} strokeWidth="1.4" strokeLinecap="round" /><circle cx="15" cy="6" r="2" stroke={c} strokeWidth="1.4" /></svg>
}
function IcMuscu({ c }: { c: string }) {
  return <svg width="18" height="18" viewBox="0 0 22 22" fill="none"><path d="M3 11H5M17 11H19M5 11V8H8V14H5V11ZM17 11V8H14V14H17V11ZM8 11H14" stroke={c} strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function IcAutre({ c }: { c: string }) {
  return <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.4" /><path d="M10 6.5V10L12.5 12" stroke={c} strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function IcKine({ c }: { c: string }) {
  return <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 3V17M3 10H17" stroke={c} strokeWidth="1.8" strokeLinecap="round" /></svg>
}

const SPORTS: { id: Sport; icon: (c: string) => ReactNode; label: string; color: string }[] = [
  { id: 'course',   icon: (c) => <IcCourse c={c} />,   label: 'Course',      color: '#F2C400' },
  { id: 'velo',     icon: (c) => <IcVelo c={c} />,     label: 'Vélo',        color: '#5B91D8' },
  { id: 'natation', icon: (c) => <IcNatation c={c} />, label: 'Natation',    color: '#7B6FD6' },
  { id: 'muscu',    icon: (c) => <IcMuscu c={c} />,    label: 'Musculation', color: '#E4574A' },
  { id: 'kine',     icon: (c) => <IcKine c={c} />,     label: 'Kiné',        color: '#EC4899' },
  { id: 'autre',    icon: (c) => <IcAutre c={c} />,    label: 'Autre',       color: '#5EBA65' },
]

const DEFAULT_TITLE: Record<Sport, string> = {
  course: 'Sortie course',
  velo: 'Sortie vélo',
  natation: 'Séance natation',
  muscu: 'Séance muscu',
  kine: 'Séance kiné',
  autre: 'Séance libre',
}

export interface SessionSplitInput { time: string; recovery: string }

export interface InitialSession {
  sport: Sport
  title: string
  duration: number
  distance?: number
  rpe: number
  notes: string
  splits: SessionSplitInput[]
}

interface Props {
  date?: string
  initial?: InitialSession
  onClose: () => void
  onSave?: (session: SessionData) => void
  onDelete?: () => void
}

export interface SessionData {
  sport: Sport
  title: string
  duration: number
  distance?: number
  rpe: number
  notes: string
  splits: { time_seconds: number; recovery_seconds: number | null }[]
}

function paceLabel(sport: Sport, distance: string, duration: number): string | null {
  const d = parseFloat(distance.replace(',', '.'))
  if (!d || d <= 0 || !duration) return null
  if (sport === 'velo') {
    const kmh = d / (duration / 60)
    return `${kmh.toFixed(1)} km/h`
  }
  if (sport === 'natation') {
    const secPer100 = (duration * 60) / (d / 100)
    const m = Math.floor(secPer100 / 60)
    const s = Math.round(secPer100 % 60)
    return `${m}'${s.toString().padStart(2, '0')}" / 100m`
  }
  const secPerKm = (duration * 60) / d
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}'${s.toString().padStart(2, '0')}" / km`
}

function RPELabel(rpe: number): string {
  if (rpe <= 2) return 'Très facile'
  if (rpe <= 4) return 'Facile'
  if (rpe <= 6) return 'Modéré'
  if (rpe <= 8) return 'Difficile'
  return 'Maximal'
}

function RPEColor(rpe: number): string {
  if (rpe <= 3) return '#5EBA65'
  if (rpe <= 5) return '#F2C400'
  if (rpe <= 7) return '#F97316'
  return '#E4574A'
}

export default function AddSessionSheet({ date, initial, onClose, onSave, onDelete }: Props) {
  const [visible, setVisible] = useState(false)
  const [sport, setSport] = useState<Sport>(initial?.sport ?? 'course')
  const [title, setTitle] = useState(initial?.title ?? DEFAULT_TITLE['course'])
  const [duration, setDuration] = useState(initial?.duration ?? 60)
  const [distance, setDistance] = useState(initial?.distance != null ? String(initial.distance) : '')
  const [rpe, setRpe] = useState(initial?.rpe ?? 6)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [splits, setSplits] = useState<SessionSplitInput[]>(initial?.splits ?? [])
  const [saved, setSaved] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  function changeSport(s: Sport) {
    setSport(s)
    if (!initial) setTitle(DEFAULT_TITLE[s])
  }

  function save() {
    const parsedSplits = splits
      .map((s) => ({
        time_seconds: parseFloat(s.time.replace(',', '.')),
        recovery_seconds: s.recovery ? parseFloat(s.recovery.replace(',', '.')) : null,
      }))
      .filter((s) => !Number.isNaN(s.time_seconds) && s.time_seconds > 0)
    const data: SessionData = { sport, title, duration, rpe, notes, splits: parsedSplits }
    if (distance) data.distance = parseFloat(distance.replace(',', '.'))
    onSave?.(data)
    setSaved(true)
    setTimeout(close, 1200)
  }

  function handleDelete() {
    onDelete?.()
    close()
  }

  const showDistance = sport !== 'muscu' && sport !== 'kine' && sport !== 'autre'
  const showSplits = sport === 'course' || sport === 'velo' || sport === 'natation'
  const sportInfo = SPORTS.find(s => s.id === sport)!
  const pace = showDistance ? paceLabel(sport, distance, duration) : null

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[90]" style={{ background: 'rgba(0,0,0,0.5)', opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={close} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[95] rounded-t-3xl overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <div className="px-5 pb-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{initial ? 'Modifier la séance' : 'Nouvelle séance'}</h2>
              {date && <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{date}</p>}
            </div>
            <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface2)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {saved ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{ background: 'rgba(94,186,101,0.15)' }}>✓</div>
              <p className="text-base font-bold text-[#5EBA65]">Séance enregistrée !</p>
            </div>
          ) : (
            <>
              {/* Sport selector */}
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>Sport</p>
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {SPORTS.map(s => (
                  <button key={s.id} onClick={() => changeSport(s.id)}
                    className="shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all"
                    style={{
                      background: sport === s.id ? s.color + '22' : 'var(--surface2)',
                      border: sport === s.id ? `1.5px solid ${s.color}` : '1.5px solid transparent',
                    }}>
                    {s.icon(sport === s.id ? s.color : 'var(--text-2)')}
                    <span className="text-[10px] font-bold" style={{ color: sport === s.id ? s.color : 'var(--text-2)' }}>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>Titre</p>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none mb-5"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1.5px solid var(--border)' }} />

              {/* Duration */}
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>Durée</p>
              <div className="flex items-center gap-4 mb-5">
                <button onClick={() => setDuration(d => Math.max(5, d - 5))}
                  className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>−</button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-black" style={{ color: 'var(--text-1)' }}>{duration}</span>
                  <span className="text-sm ml-1" style={{ color: 'var(--text-2)' }}>min</span>
                </div>
                <button onClick={() => setDuration(d => Math.min(300, d + 5))}
                  className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>+</button>
              </div>

              {/* Distance + Allure */}
              {showDistance && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Distance (optionnel)</p>
                    {pace && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${sportInfo.color}22`, color: sportInfo.color }}>
                        Allure {pace}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-5">
                    <input value={distance} onChange={e => setDistance(e.target.value)}
                      placeholder="0,0" inputMode="decimal"
                      className="flex-1 px-4 py-3 rounded-2xl text-sm font-semibold outline-none text-center"
                      style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1.5px solid var(--border)' }} />
                    <span className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>
                      {sport === 'natation' ? 'm' : 'km'}
                    </span>
                  </div>
                </>
              )}

              {/* RPE */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Effort perçu (RPE)</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: RPEColor(rpe) + '22', color: RPEColor(rpe) }}>
                  {rpe}/10 · {RPELabel(rpe)}
                </span>
              </div>
              <div className="relative mb-5">
                <input type="range" min={1} max={10} value={rpe}
                  onChange={e => setRpe(Number(e.target.value))}
                  className="w-full h-2 rounded-full outline-none appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${RPEColor(rpe)} ${(rpe - 1) / 9 * 100}%, var(--surface2) ${(rpe - 1) / 9 * 100}%)` }} />
                <div className="flex justify-between mt-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map(v => (
                    <span key={v} className="text-[8px]" style={{ color: 'var(--text-2)' }}>{v}</span>
                  ))}
                </div>
              </div>

              {/* Splits — fractionné intervals, one row per rep */}
              {showSplits && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Fractionné — chronos par répétition (optionnel)</p>
                    <button onClick={() => setSplits((p) => [...p, { time: '', recovery: '' }])} className="text-xs font-bold" style={{ color: sportInfo.color }}>
                      + Ajouter
                    </button>
                  </div>
                  {splits.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 pl-14">
                        <span className="flex-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Temps (sec.)</span>
                        <span className="flex-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Récup (sec.)</span>
                        <span className="w-4" />
                      </div>
                      {splits.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs w-12 shrink-0" style={{ color: 'var(--text-2)' }}>Rép. {i + 1}</span>
                          <input value={s.time} onChange={(e) => setSplits((p) => p.map((v, j) => j === i ? { ...v, time: e.target.value } : v))}
                            placeholder="sec." inputMode="decimal"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1.5px solid var(--border)' }} />
                          <input value={s.recovery} onChange={(e) => setSplits((p) => p.map((v, j) => j === i ? { ...v, recovery: e.target.value } : v))}
                            placeholder="sec." inputMode="decimal"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1.5px solid var(--border)' }} />
                          <button onClick={() => setSplits((p) => p.filter((_, j) => j !== i))} className="text-xs shrink-0 w-4" style={{ color: '#E4574A' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>Notes (optionnel)</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Sensations, conditions, remarques..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none mb-6"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1.5px solid var(--border)' }} />

              {/* Save */}
              <button onClick={save}
                className="w-full py-4 rounded-2xl font-black text-base text-[#0E0E0D] transition-all active:scale-[0.97]"
                style={{ background: sportInfo.color, boxShadow: `0 4px 20px ${sportInfo.color}55` }}>
                Enregistrer la séance
              </button>

              {initial && onDelete && (
                confirmingDelete ? (
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleDelete}
                      className="flex-1 py-3 rounded-2xl font-bold text-sm text-white" style={{ background: '#E4574A' }}>
                      Confirmer la suppression
                    </button>
                    <button onClick={() => setConfirmingDelete(false)}
                      className="flex-1 py-3 rounded-2xl font-semibold text-sm" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmingDelete(true)}
                    className="w-full py-3 mt-3 rounded-2xl font-semibold text-sm" style={{ color: '#E4574A' }}>
                    Supprimer la séance
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
