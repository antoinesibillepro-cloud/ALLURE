import { useState, useEffect, useRef } from 'react'
import { Card, SectionLabel } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchAthleteWeekStats } from '../lib/queries/stats'

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - day)
  return s
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

// ── Donut chart (multi-segment) ───────────────────────────────────────────────
type Segment = { label: string; pct: number; sessions: number; color: string }
function DonutChart({ segments, total }: { segments: Segment[]; total: number }) {
  const R = 64, CX = 80, CY = 80, STROKE = 22
  const circ = 2 * Math.PI * R
  const [animated, setAnimated] = useState(false)
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  let offset = 0
  const segs = segments.map((s) => {
    const dash = animated ? (s.pct / 100) * circ : 0
    const gap = circ - dash
    const o = offset
    offset += (s.pct / 100) * circ
    return { ...s, dash, gap, o }
  })

  return (
    <div className="flex flex-col items-center">
      <svg ref={ref} viewBox="0 0 160 160" width="160" height="160">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--surface2)" strokeWidth={STROKE} />
        {segs.map((s, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none"
            stroke={s.color} strokeWidth={STROKE}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.o}
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)', transform: 'rotate(-90deg)', transformOrigin: `${CX}px ${CY}px` }}
          />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="24" fontWeight="900" fill="var(--text-1)">{total}</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill="var(--text-2)">séances</text>
      </svg>
      <div className="w-full space-y-2 mt-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-sm flex-1" style={{ color: 'var(--text-1)' }}>{s.label}</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{s.pct} %</span>
            <span className="text-sm w-4 text-right" style={{ color: 'var(--text-2)' }}>{s.sessions}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, labels, color = '#F2C400' }: { data: number[]; labels: string[]; color?: string }) {
  const W = 320, H = 120, MAX_Y = 2000
  const barW = (W - 16) / data.length - 4
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
      {[0, 500, 1000, 1500, 2000].map(v => {
        const y = H - (v / MAX_Y) * H
        return (
          <g key={v}>
            <line x1="8" x2={W - 8} y1={y} y2={y} stroke="var(--border)" strokeWidth="0.5" />
            <text x="6" y={y - 2} fontSize="7" fill="var(--text-2)" textAnchor="start">{v > 0 ? v : ''}</text>
          </g>
        )
      })}
      {data.map((v, i) => {
        const x = 8 + i * ((W - 16) / data.length)
        const bh = (v / MAX_Y) * H
        const y = H - bh
        const isMax = v === Math.max(...data)
        return (
          <g key={i}>
            <rect x={x + 2} y={y} width={barW} height={bh} fill={color} rx="2" opacity={isMax ? 1 : 0.5} />
            {isMax && (
              <text x={x + 2 + barW / 2} y={y - 4} fontSize="7" fill={color} textAnchor="middle" fontWeight="bold">
                {v} pts
              </text>
            )}
            <text x={x + 2 + barW / 2} y={H + 12} fontSize="8" fill="var(--text-2)" textAnchor="middle">{labels[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Weight line chart ─────────────────────────────────────────────────────────
const WEIGHT_DATA = [
  { label: '3 août', w: 50.2 }, { label: '4 août', w: 51.0 },
  { label: '5 août', w: 51.5 }, { label: '7 août', w: 52.8 },
  { label: '8 août', w: 53.4 }, { label: '9 août', w: 54.6 },
  { label: '10 août', w: 55.0 },
]
function WeightMiniChart() {
  const W = 320, H = 72
  const vals = WEIGHT_DATA.map(d => d.w)
  const min = Math.min(...vals) - 1
  const max = Math.max(...vals) + 0.5
  const pts = vals.map((v, i) => ({
    x: 8 + (i / (vals.length - 1)) * (W - 16),
    y: H - ((v - min) / (max - min)) * H * 0.85,
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
      <text x="8" y={H - 2} fontSize="8" fill="var(--text-2)">{WEIGHT_DATA[0].label}</text>
      <text x={W - 8} y={H - 2} fontSize="8" fill="var(--text-2)" textAnchor="end">
        {WEIGHT_DATA[WEIGHT_DATA.length - 1].label}
      </text>
    </svg>
  )
}

// ── Wellness bar ──────────────────────────────────────────────────────────────
function WellnessBar({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
  const [w, setW] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTimeout(() => setW((value / max) * 100), 100) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [value, max])
  return (
    <div ref={ref} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="text-sm w-24 shrink-0" style={{ color: 'var(--text-1)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="text-sm font-bold w-10 text-right" style={{ color: 'var(--text-1)' }}>{value}/{max}</span>
    </div>
  )
}

// ── data ──────────────────────────────────────────────────────────────────────
const DISCIPLINES: Segment[] = [
  { label: 'Course à pied', pct: 56, sessions: 5, color: '#F2C400' },
  { label: 'Vélo',          pct: 11, sessions: 1, color: '#5B91D8' },
  { label: 'Natation',      pct: 11, sessions: 1, color: '#7B6FD6' },
  { label: 'Musculation',   pct: 22, sessions: 2, color: '#E4574A' },
]

const CHARGE_DATA   = [120, 0, 80, 200, 350, 180, 90, 0, 240, 1820, 0]
const CHARGE_LABELS = ['S23','S24','S25','S26','S27','S28','S29','S30','S31','S32','S33']

const WELLNESS = [
  { icon: '😴', label: 'Sommeil',    value: 3.5, max: 5,  color: '#5B91D8' },
  { icon: '⚡', label: 'Courbatures', value: 2,   max: 10, color: '#E4574A' },
  { icon: '🔋', label: 'Fatigue',    value: 3,   max: 10, color: '#7B6FD6' },
  { icon: '🧠', label: 'Stress',     value: 4,   max: 10, color: '#F97316' },
  { icon: '🔥', label: 'Motivation', value: 6,   max: 10, color: '#5EBA65' },
]

const MONTHLY_KM = [172, 198, 215, 228, 187, 67]
const MONTHS_SHORT = ['Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû']
const WEEK_DOTS = [true, true, false, true, true, true, false]

type RecordEntry = { dist: string; time: string; sb: boolean }
const INIT_RECORDS: RecordEntry[] = [
  { dist: '1500 m', time: "4'02", sb: false },
  { dist: '3000 m', time: "9'12", sb: false },
  { dist: '5 km',   time: "16'22", sb: true  },
  { dist: '10 km',  time: "33'47", sb: false },
]

type Tab = 'progres' | 'repartition' | 'records'

// ── component ─────────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { profile } = useApp()
  const [tab, setTab] = useState<Tab>('progres')
  const [records, setRecords] = useState<RecordEntry[]>(INIT_RECORDS)
  const [newDist, setNewDist] = useState('')
  const [newTime, setNewTime] = useState('')

  const weekStart = isoDate(startOfWeek(new Date()))
  const weekEnd = isoDate(new Date(startOfWeek(new Date()).getTime() + 7 * 24 * 3600 * 1000))
  const { data: weekStats } = useQuery(
    () => (profile ? fetchAthleteWeekStats(profile.id, weekStart, weekEnd) : Promise.resolve(null)),
    [profile?.id, weekStart],
  )

  function addRecord() {
    if (!newDist.trim() || !newTime.trim()) return
    setRecords(r => [...r, { dist: newDist.trim(), time: newTime.trim(), sb: false }])
    setNewDist(''); setNewTime('')
  }

  return (
    <div className="max-w-xl mx-auto pb-10">

      {/* ── Header + tabs ── */}
      <div className="px-4 pt-5 pb-0 sticky top-0 z-10" style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Statistiques</h1>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
            Saison 2026/2027
          </span>
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
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>2 pesées enregistrées</p>
              </div>
            </div>
            <WeightMiniChart />
            <p className="text-xs mt-2 font-semibold" style={{ color: '#5EBA65' }}>
              +5 kg depuis la première pesée.
            </p>
          </Card>

          {/* Forme — évolution */}
          <Card>
            <p className="text-base font-bold mb-0.5" style={{ color: 'var(--text-1)' }}>Forme — évolution</p>
            <p className="text-xs mb-1" style={{ color: 'var(--text-2)' }}>Moyenne par semaine · 12 dernières semaines</p>
            <p className="text-xs italic mb-3" style={{ color: 'var(--text-2)' }}>
              Pas encore assez de bilans de forme enregistrés pour sommeil.
            </p>
            {WELLNESS.map(w => (
              <WellnessBar key={w.label} {...w} />
            ))}
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
                <p className="text-3xl font-black" style={{ color: 'var(--text-1)' }}>5</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F2C400]">Série</p>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Régularité</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>5 semaines sans manquer une séance</p>
                <div className="flex gap-1.5 mt-2">
                  {WEEK_DOTS.map((done, i) => (
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
        <div className="space-y-3 p-4">

          {/* Par discipline donut */}
          <Card>
            <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-1)' }}>Par discipline</p>
            <DonutChart segments={DISCIPLINES} total={9} />
            <div className="flex justify-center gap-1.5 mt-4">
              {[0, 1].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? '#F2C400' : 'var(--surface2)' }} />
              ))}
            </div>
          </Card>

          {/* Charge d'entraînement */}
          <Card>
            <p className="text-base font-bold mb-0.5" style={{ color: 'var(--text-1)' }}>Charge d&apos;entraînement</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>RPE × durée · 12 dernières semaines</p>
            <BarChart data={CHARGE_DATA} labels={CHARGE_LABELS} />
          </Card>

          {/* Bilan par mois */}
          <Card>
            <p className="text-base font-bold mb-3" style={{ color: 'var(--text-1)' }}>Bilan par mois</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                <span>Mois</span><span className="text-right">KM prévus</span><span className="text-right">KM course</span>
              </div>
              {[
                { mois: 'août',   prev: 10, real: 92 },
                { mois: 'Saison', prev: 10, real: 92 },
              ].map((r, i) => (
                <div key={i} className="grid grid-cols-3 px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{r.mois}</span>
                  <span className="text-sm text-right" style={{ color: 'var(--text-2)' }}>{r.prev}</span>
                  <span className="text-sm font-bold text-right" style={{ color: r.real > r.prev ? '#5EBA65' : 'var(--text-1)' }}>{r.real}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Saison totals */}
          <Card>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Saison 2026–27</p>
            <div className="flex gap-6">
              <div><p className="text-xs mb-0.5" style={{ color: 'var(--text-2)' }}>Volume</p><p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>92 <span className="text-sm font-normal">km</span></p></div>
              <div><p className="text-xs mb-0.5" style={{ color: 'var(--text-2)' }}>Séances</p><p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>9</p></div>
              <div><p className="text-xs mb-0.5" style={{ color: 'var(--text-2)' }}>Heures</p><p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>6h</p></div>
            </div>
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

            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_44px] px-0 mb-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-2)' }}>
              <span>Distance</span><span className="text-right">Record</span><span className="text-center">SB</span>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {records.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_44px] items-center px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'var(--border)' }}>
                  <input value={r.dist}
                    onChange={e => setRecords(recs => recs.map((rec, j) => j === i ? { ...rec, dist: e.target.value } : rec))}
                    className="text-sm font-semibold bg-transparent outline-none w-full"
                    style={{ color: 'var(--text-1)' }} />
                  <input value={r.time}
                    onChange={e => setRecords(recs => recs.map((rec, j) => j === i ? { ...rec, time: e.target.value } : rec))}
                    className="text-sm font-bold text-right bg-transparent outline-none w-full"
                    style={{ color: 'var(--text-1)' }} />
                  <div className="flex justify-center">
                    <button onClick={() => setRecords(recs => recs.map((rec, j) => j === i ? { ...rec, sb: !rec.sb } : rec))}
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                      style={{ background: r.sb ? '#F2C400' : 'var(--surface2)' }}>
                      {r.sb && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#0E0E0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

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
            <button className="mt-2 text-sm font-semibold text-[#F2C400] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Ajouter un record
            </button>

            <p className="mt-4 text-[10px] italic leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Coche <span className="font-bold not-italic">SB</span> pour un record battu cette saison. Les modifications sont enregistrées dès que tu quittes un champ — l&apos;athlète comme le coach peuvent les corriger.
            </p>
          </Card>
        </div>
      )}

    </div>
  )
}
