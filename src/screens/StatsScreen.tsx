import { useState } from 'react'
import { Card } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchAthleteWeekStats, fetchWellnessAverages, fetchWeeklyStreak } from '../lib/queries/stats'
import { fetchWeightLogs, type WeightLog } from '../lib/queries/profileExtras'
import {
  fetchPersonalRecords, createPersonalRecord, updatePersonalRecord, deletePersonalRecord, type PersonalRecord,
} from '../lib/queries/profileExtras'

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - day)
  return s
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

// ── Weight line chart ─────────────────────────────────────────────────────────
function WeightMiniChart({ logs }: { logs: WeightLog[] }) {
  const W = 320, H = 72
  const vals = logs.map(d => d.weight_kg)
  const min = Math.min(...vals) - 1
  const max = Math.max(...vals) + 0.5
  const pts = vals.map((v, i) => ({
    x: 8 + (logs.length > 1 ? (i / (vals.length - 1)) * (W - 16) : (W - 16) / 2),
    y: H - ((v - min) / (max - min || 1)) * H * 0.85,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 72 }}>
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2C400" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#F2C400" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#wg)" />
      <path d={line} fill="none" stroke="#F2C400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4" fill="#F2C400" />
      <rect x={last.x + 5} y={last.y - 10} width="38" height="14" rx="4" fill="#F2C400" />
      <text x={last.x + 24} y={last.y + 1} fontSize="9" fill="#0E0E0D" fontWeight="bold" textAnchor="middle">
        {vals[vals.length - 1]} kg
      </text>
      <text x="8" y={H - 2} fontSize="8" fill="var(--text-2)">
        {new Date(logs[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
      </text>
      <text x={W - 8} y={H - 2} fontSize="8" fill="var(--text-2)" textAnchor="end">
        {new Date(logs[logs.length - 1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
      </text>
    </svg>
  )
}

// ── Wellness bar ──────────────────────────────────────────────────────────────
function WellnessBar({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
  const w = (value / max) * 100
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="text-sm w-24 shrink-0" style={{ color: 'var(--text-1)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="text-sm font-bold w-10 text-right" style={{ color: 'var(--text-1)' }}>{value.toFixed(1)}/{max}</span>
    </div>
  )
}

type Tab = 'progres' | 'repartition' | 'records'

// ── component ─────────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { profile } = useApp()
  const [tab, setTab] = useState<Tab>('progres')
  const [newDist, setNewDist] = useState('')
  const [newTime, setNewTime] = useState('')

  const weekStart = isoDate(startOfWeek(new Date()))
  const weekEnd = isoDate(new Date(startOfWeek(new Date()).getTime() + 7 * 24 * 3600 * 1000))
  const { data: weekStats } = useQuery(
    () => (profile ? fetchAthleteWeekStats(profile.id, weekStart, weekEnd) : Promise.resolve(null)),
    [profile?.id, weekStart],
  )
  const { data: weightLogs } = useQuery<WeightLog[]>(
    () => (profile ? fetchWeightLogs(profile.id, 20) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: wellness } = useQuery(
    () => (profile ? fetchWellnessAverages(profile.id) : Promise.resolve(null)),
    [profile?.id],
  )
  const { data: streak } = useQuery(
    () => (profile ? fetchWeeklyStreak(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: records, refetch: refetchRecords } = useQuery<PersonalRecord[]>(
    () => (profile ? fetchPersonalRecords(profile.id) : Promise.resolve([])),
    [profile?.id],
  )

  const currentStreak = streak ? [...streak].reverse().findIndex((v) => !v) : 0
  const streakCount = currentStreak === -1 ? (streak?.length ?? 0) : currentStreak

  async function addRecord() {
    if (!profile || !newDist.trim() || !newTime.trim()) return
    await createPersonalRecord(profile.id, newDist.trim(), newTime.trim(), new Date().toISOString().slice(0, 10))
    setNewDist(''); setNewTime('')
    await refetchRecords()
  }

  return (
    <div className="max-w-xl mx-auto pb-10">

      {/* ── Header + tabs ── */}
      <div className="px-4 pt-5 pb-0 sticky top-0 z-10" style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Statistiques</h1>
        </div>
        <div className="flex" style={{ borderBottom: '2px solid var(--border)' }}>
          {([
            { id: 'progres' as Tab, label: 'Progrès' },
            { id: 'repartition' as Tab, label: 'Répartition' },
            { id: 'records' as Tab, label: 'Records' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 pb-3 text-sm font-semibold relative"
              style={{ color: tab === t.id ? 'var(--text-1)' : 'var(--text-2)' }}>
              {t.label}
              {tab === t.id && <span className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-[#F2C400]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ PROGRÈS ═══════════════ */}
      {tab === 'progres' && (
        <div className="space-y-3 p-4">

          {/* Évolution du poids */}
          <Card>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Évolution du poids</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {weightLogs?.length ?? 0} pesée{(weightLogs?.length ?? 0) > 1 ? 's' : ''} enregistrée{(weightLogs?.length ?? 0) > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {!weightLogs?.length ? (
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Ajoute une pesée depuis l'écran d'accueil.</p>
            ) : (
              <>
                <WeightMiniChart logs={weightLogs} />
                {weightLogs.length > 1 && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: '#5EBA65' }}>
                    {(weightLogs[weightLogs.length - 1].weight_kg - weightLogs[0].weight_kg).toFixed(1)} kg depuis la première pesée.
                  </p>
                )}
              </>
            )}
          </Card>

          {/* Forme — évolution */}
          <Card>
            <p className="text-base font-bold mb-0.5" style={{ color: 'var(--text-1)' }}>Forme — évolution</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>Moyenne des bilans · 12 dernières semaines</p>
            {!wellness || wellness.count === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Pas encore de bilan de forme enregistré.</p>
            ) : (
              <>
                <WellnessBar icon="😴" label="Sommeil" value={wellness.sleep} max={5} color="#5B91D8" />
                <WellnessBar icon="⚡" label="Courbatures" value={wellness.soreness} max={5} color="#E4574A" />
                <WellnessBar icon="🔋" label="Fatigue" value={wellness.fatigue} max={5} color="#7B6FD6" />
                <WellnessBar icon="🧠" label="Stress" value={wellness.stress} max={5} color="#F97316" />
                <WellnessBar icon="🔥" label="Motivation" value={wellness.motivation} max={5} color="#5EBA65" />
              </>
            )}
          </Card>

          {/* Cette semaine */}
          <Card>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Cette semaine</p>
            <div className="flex gap-6">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-2)' }}>Distance</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{Math.round(weekStats?.kmDone ?? 0)} <span className="text-sm font-normal">/ {Math.round(weekStats?.kmPlanned ?? 0)} km</span></p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-2)' }}>Séances</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{weekStats?.sessionsDone ?? 0} <span className="text-sm font-normal">/ {weekStats?.sessionsPlanned ?? 0}</span></p>
              </div>
            </div>
          </Card>

          {/* Série */}
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center shrink-0">
                <p className="text-3xl font-black" style={{ color: 'var(--text-1)' }}>{streakCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F2C400]">Série</p>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Régularité</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{streakCount} semaine{streakCount > 1 ? 's' : ''} avec au moins une séance</p>
                <div className="flex gap-1.5 mt-2">
                  {(streak ?? []).map((done, i) => (
                    <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: done ? '#F2C400' : 'var(--surface2)' }}>
                      {done && <svg width="7" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#0E0E0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

        </div>
      )}

      {/* ═══════════════ RÉPARTITION ═══════════════ */}
      {tab === 'repartition' && (
        <div className="p-4">
          <Card>
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-2)' }}>
              La répartition par discipline et la charge d'entraînement arrivent dans une prochaine version.
            </p>
          </Card>
        </div>
      )}

      {/* ═══════════════ RECORDS ═══════════════ */}
      {tab === 'records' && (
        <div className="p-4 space-y-3">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🏆</span>
              <p className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Records personnels</p>
            </div>

            {!records?.length ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucun record enregistré.</p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_80px_44px] px-0 mb-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-2)' }}>
                  <span>Distance</span><span className="text-right">Record</span><span className="text-center">SB</span>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {records.map((r) => (
                    <div key={r.id} className="grid grid-cols-[1fr_80px_44px] items-center px-4 py-3 border-b last:border-b-0"
                      style={{ borderColor: 'var(--border)' }}>
                      <input defaultValue={r.discipline}
                        onBlur={(e) => e.target.value !== r.discipline && updatePersonalRecord(r.id, { discipline: e.target.value }).then(refetchRecords)}
                        className="text-sm font-semibold bg-transparent outline-none w-full"
                        style={{ color: 'var(--text-1)' }} />
                      <input defaultValue={r.value}
                        onBlur={(e) => e.target.value !== r.value && updatePersonalRecord(r.id, { value: e.target.value }).then(refetchRecords)}
                        className="text-sm font-bold text-right bg-transparent outline-none w-full"
                        style={{ color: 'var(--text-1)' }} />
                      <div className="flex justify-center gap-1">
                        <button onClick={() => updatePersonalRecord(r.id, { is_season_best: !r.is_season_best }).then(refetchRecords)}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                          style={{ background: r.is_season_best ? '#F2C400' : 'var(--surface2)' }}>
                          {r.is_season_best && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="#0E0E0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Add record row */}
            <div className="mt-3 flex items-center gap-2">
              <input value={newDist} onChange={e => setNewDist(e.target.value)} placeholder="Distance"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
              <input value={newTime} onChange={e => setNewTime(e.target.value)} placeholder="Temps"
                className="w-24 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
              <button onClick={addRecord}
                className="text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
                style={{ background: '#F2C400', color: '#0E0E0D' }}>+</button>
            </div>

            <p className="mt-4 text-[10px] italic leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Coche <span className="font-bold not-italic">SB</span> pour un record battu cette saison.
            </p>
          </Card>
        </div>
      )}

    </div>
  )
}
