import { useState } from 'react'
import { validateSession, saveSessionSplits, type WorkBlockWithTargets } from '../lib/queries/sessions'

const RPE_OPTIONS = [{ v: 2, l: 'Facile' }, { v: 4, l: 'Modéré' }, { v: 6, l: 'Soutenu' }, { v: 8, l: 'Dur' }, { v: 10, l: 'Max' }]

export interface ValidationSplit { time: string; recovery: string }

interface Props {
  sessionId: string
  profileId: string
  plannedDistanceKm: number | null
  plannedDurationMin: number | null
  workBlock: WorkBlockWithTargets | null
  /** True when this session was auto-marked done from a Strava sync — the athlete must review and confirm it, not just glance and skip. */
  needsConfirmation?: boolean
  initialDistanceKm?: number | null
  initialDurationMin?: number | null
  initialSplits?: ValidationSplit[]
  onValidated: () => void
}

/** Full "how did the session go" form: RPE, actual distance/duration (with computed pace), and interval splits — shared between Home and Entraînements so validating a coach-planned session collects the same data everywhere. */
export default function SessionValidationForm({
  sessionId, profileId, plannedDistanceKm, plannedDurationMin, workBlock, needsConfirmation,
  initialDistanceKm, initialDurationMin, initialSplits, onValidated,
}: Props) {
  const [rpe, setRpe] = useState<number | null>(null)
  const [actualDistance, setActualDistance] = useState(initialDistanceKm != null ? String(initialDistanceKm) : '')
  const [actualDuration, setActualDuration] = useState(initialDurationMin != null ? String(initialDurationMin) : '')
  const [splits, setSplits] = useState<ValidationSplit[]>(initialSplits ?? [])
  const [validating, setValidating] = useState(false)

  const validationPace = (() => {
    const d = actualDistance ? parseFloat(actualDistance.replace(',', '.')) : null
    const m = actualDuration ? parseInt(actualDuration, 10) : null
    if (!d || !m || d <= 0) return null
    const secPerKm = (m * 60) / d
    const mm = Math.floor(secPerKm / 60)
    const ss = Math.round(secPerKm % 60)
    return `${mm}'${ss.toString().padStart(2, '0')}"/km`
  })()

  const requireSplits = !!needsConfirmation
  const splitsValid = !requireSplits || splits.some((s) => s.time.trim())
  const canSave = rpe !== null && splitsValid

  async function handleValidate() {
    if (!profileId || rpe === null || !canSave) return
    setValidating(true)
    try {
      const distanceKm = actualDistance ? parseFloat(actualDistance.replace(',', '.')) : null
      const durationMin = actualDuration ? parseInt(actualDuration, 10) : null
      const completionId = await validateSession(sessionId, profileId, rpe, '', distanceKm, durationMin)
      const parsedSplits = splits
        .map((s, i) => ({
          rep_number: i + 1,
          time_seconds: parseFloat(s.time.replace(',', '.')),
          recovery_seconds: s.recovery ? parseFloat(s.recovery.replace(',', '.')) : null,
        }))
        .filter((s) => !Number.isNaN(s.time_seconds) && s.time_seconds > 0)
      await saveSessionSplits(completionId, parsedSplits)
      onValidated()
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
      {needsConfirmation && (
        <div className="rounded-[12px] px-3 py-2.5" style={{ background: 'rgba(252,82,0,0.1)', border: '1px solid rgba(252,82,0,0.25)' }}>
          <p className="text-xs font-bold" style={{ color: '#FC5200' }}>Importée de Strava — à confirmer</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
            Vérifie la distance/durée, indique ton ressenti et entre au moins un temps de fractionné pour valider.
          </p>
        </div>
      )}
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
            placeholder={plannedDistanceKm ? String(plannedDistanceKm) : '—'}
            className="w-full px-3 py-2 rounded-[10px] text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Durée réelle (min)</p>
          <input value={actualDuration} onChange={(e) => setActualDuration(e.target.value)} inputMode="numeric"
            placeholder={plannedDurationMin ? String(plannedDurationMin) : '—'}
            className="w-full px-3 py-2 rounded-[10px] text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
        </div>
      </div>
      {validationPace && (
        <p className="text-xs -mt-2" style={{ color: '#F2C400' }}>Allure moyenne : <span className="font-bold">{validationPace}</span></p>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            Chronos par répétition {requireSplits ? '(obligatoire)' : '(optionnel)'}
          </p>
          <div className="flex items-center gap-3">
            {!!workBlock?.target_splits.length && splits.length === 0 && (
              <button onClick={() => setSplits(workBlock.target_splits.map((t) => ({ time: '', recovery: t.recovery_seconds ? String(t.recovery_seconds) : '' })))} className="text-xs font-bold" style={{ color: '#5B91D8' }}>
                Pré-remplir ({workBlock.target_splits.length})
              </button>
            )}
            <button onClick={() => setSplits((p) => [...p, { time: '', recovery: '' }])} className="text-xs font-bold" style={{ color: '#F2C400' }}>+ Ajouter</button>
          </div>
        </div>
        {!!workBlock?.target_splits.length && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {workBlock.target_splits.map((t, i) => (
              <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                #{i + 1}{t.distance_m ? ` ${t.distance_m}m` : ''} obj. {t.target_time_seconds}s{t.recovery_seconds ? ` · r${t.recovery_seconds}s` : ''}
              </span>
            ))}
          </div>
        )}
        {splits.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 pl-16">
              <span className="flex-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Temps</span>
              <span className="flex-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Récup</span>
              <span className="w-4" />
            </div>
            {splits.map((s, i) => {
              const target = workBlock?.target_splits[i]?.target_time_seconds
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-2)' }}>Rép. {i + 1}</span>
                  <input value={s.time} onChange={(e) => setSplits((p) => p.map((v, j) => j === i ? { ...v, time: e.target.value } : v))}
                    placeholder={target ? `cible ${target}s` : 'sec.'} inputMode="decimal"
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-[10px] text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                  <input value={s.recovery} onChange={(e) => setSplits((p) => p.map((v, j) => j === i ? { ...v, recovery: e.target.value } : v))}
                    placeholder="sec." inputMode="decimal"
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-[10px] text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                  <button onClick={() => setSplits((p) => p.filter((_, j) => j !== i))} className="text-xs shrink-0 w-4" style={{ color: '#E4574A' }}>×</button>
                </div>
              )
            })}
          </div>
        )}
        {requireSplits && !splitsValid && (
          <p className="text-xs mt-1.5" style={{ color: '#E4574A' }}>Entre au moins un temps de répétition pour confirmer cette séance.</p>
        )}
      </div>

      <button onClick={handleValidate} disabled={validating || !canSave}
        className="w-full py-3 rounded-[12px] text-sm font-bold disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
        {validating ? 'Enregistrement…' : needsConfirmation ? 'Confirmer la séance' : 'Enregistrer la séance'}
      </button>
    </div>
  )
}
