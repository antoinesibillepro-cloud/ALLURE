import type { DisciplineBreakdown } from '../lib/queries/crossTraining'

export const DISC_COLORS: Record<string, string> = {
  'Course à pied': '#F2C400', 'Vélo': '#5B91D8', 'Natation': '#7B6FD6', 'Musculation': '#E4574A', 'Gainage': '#5EBA65',
}

export function DonutChart({ segments, weightBy = 'sessions' }: { segments: DisciplineBreakdown[]; weightBy?: 'sessions' | 'km' }) {
  const R = 64, CX = 80, CY = 80, STROKE = 22
  const circ = 2 * Math.PI * R
  const total = segments.reduce((s, d) => s + d[weightBy], 0)
  let acc = 0
  const segs = segments.map((s) => {
    const pct = total > 0 ? s[weightBy] / total : 0
    const dash = pct * circ
    const seg = { ...s, dash: Math.max(dash - 3, 0), offset: acc, pct: Math.round(pct * 100) }
    acc += dash
    return seg
  })
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: 160, height: 160 }}>
        <svg width={160} height={160} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--surface2)" strokeWidth={STROKE} />
          {segs.map((s, i) => (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={DISC_COLORS[s.discipline] ?? '#999'} strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${circ - s.dash}`} strokeDashoffset={-s.offset} strokeLinecap="round" />
          ))}
        </svg>
        <div className="absolute text-center">
          <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{weightBy === 'km' ? Math.round(total) : total}</p>
          <p className="text-[9px] mt-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>{weightBy === 'km' ? 'km' : 'séances'}</p>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {segs.map((s) => (
          <div key={s.discipline} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: DISC_COLORS[s.discipline] ?? '#999' }} />
            <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-2)' }}>{s.discipline}</span>
            <span className="text-xs font-black" style={{ color: 'var(--text-1)' }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Generic donut chart for any {label, count} breakdown, colors assigned from a fixed palette in order. */
export function GenericDonutChart({ segments, colors, unitLabel = 'séances' }: { segments: { label: string; count: number }[]; colors: string[]; unitLabel?: string }) {
  const R = 64, CX = 80, CY = 80, STROKE = 22
  const circ = 2 * Math.PI * R
  const total = segments.reduce((s, d) => s + d.count, 0)
  let acc = 0
  const segs = segments.map((s, i) => {
    const pct = total > 0 ? s.count / total : 0
    const dash = pct * circ
    const seg = { ...s, color: colors[i % colors.length], dash: Math.max(dash - 3, 0), offset: acc, pct: Math.round(pct * 100) }
    acc += dash
    return seg
  })
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: 160, height: 160 }}>
        <svg width={160} height={160} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--surface2)" strokeWidth={STROKE} />
          {segs.map((s, i) => (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={s.color} strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${circ - s.dash}`} strokeDashoffset={-s.offset} strokeLinecap="round" />
          ))}
        </svg>
        <div className="absolute text-center">
          <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{total}</p>
          <p className="text-[9px] mt-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>{unitLabel}</p>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-2)' }}>{s.label}</span>
            <span className="text-xs font-black" style={{ color: 'var(--text-1)' }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Filled line/area trend chart with gridlines — matches the Figma "Charge d'entraînement" style. */
export function AreaTrendChart({ data, color = '#F2C400', unit = '' }: { data: { label: string; value: number }[]; color?: string; unit?: string }) {
  const W = 320, H = 140, PAD_L = 30, PAD_B = 16, PAD_T = 8
  const max = Math.max(...data.map((d) => d.value), 1)
  const gridSteps = 4
  const plotW = W - PAD_L
  const plotH = H - PAD_B - PAD_T
  const px = (i: number) => PAD_L + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2)
  const py = (v: number) => PAD_T + plotH - (v / max) * plotH
  const pts = data.map((d, i) => `${px(i).toFixed(1)},${py(d.value).toFixed(1)}`).join(' ')
  const area = `${PAD_L},${PAD_T + plotH} ${pts} ${W},${PAD_T + plotH}`
  const gid = `area-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: gridSteps + 1 }, (_, i) => {
        const v = (max / gridSteps) * i
        const y = py(v)
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={0} y={y + 3} fontSize="8" fill="var(--text-2)">{Math.round(v)}{unit}</text>
          </g>
        )
      })}
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={px(i)} cy={py(d.value)} r={i === data.length - 1 ? 3 : 0} fill={color} />
      ))}
      {data.map((d, i) => (
        (i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) && (
          <text key={i} x={px(i)} y={H - 2} fontSize="8" fill="var(--text-2)" textAnchor="middle">{d.label}</text>
        )
      ))}
    </svg>
  )
}

export function LoadChart({ data }: { data: { label: string; load: number }[] }) {
  return <AreaTrendChart data={data.map((d) => ({ label: d.label, value: d.load }))} color="#F2C400" />
}
