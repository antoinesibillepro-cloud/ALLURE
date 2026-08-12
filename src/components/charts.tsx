import type { DisciplineBreakdown } from '../lib/queries/crossTraining'

export const DISC_COLORS: Record<string, string> = {
  'Course à pied': '#F2C400', 'Vélo': '#5B91D8', 'Natation': '#7B6FD6', 'Musculation': '#E4574A', 'Gainage': '#5EBA65',
}

export function DonutChart({ segments }: { segments: DisciplineBreakdown[] }) {
  const R = 64, CX = 80, CY = 80, STROKE = 22
  const circ = 2 * Math.PI * R
  const total = segments.reduce((s, d) => s + d.sessions, 0)
  let acc = 0
  const segs = segments.map((s) => {
    const pct = total > 0 ? s.sessions / total : 0
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
          <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{total}</p>
          <p className="text-[9px] mt-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>séances</p>
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

export function LoadChart({ data }: { data: { label: string; load: number }[] }) {
  const max = Math.max(...data.map((d) => d.load), 1)
  return (
    <div className="flex items-end gap-1.5" style={{ height: 100 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-sm" style={{ height: `${(d.load / max) * 76}px`, minHeight: d.load > 0 ? 3 : 0, background: i === data.length - 1 ? '#F2C400' : 'var(--surface3)' }} />
          <span className="text-[8px]" style={{ color: 'var(--text-2)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}
