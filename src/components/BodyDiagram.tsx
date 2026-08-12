const ZONES: { key: string; label: string; path: string }[] = [
  { key: 'epaules', label: 'Épaules', path: 'M30,28 h40 v10 h-40 Z' },
  { key: 'bras', label: 'Bras', path: 'M18,40 h10 v35 h-10 Z M72,40 h10 v35 h-10 Z' },
  { key: 'abdos', label: 'Abdos', path: 'M32,40 h36 v30 h-36 Z' },
  { key: 'dos', label: 'Dos', path: 'M30,70 h40 v5 h-40 Z' },
  { key: 'fessiers', label: 'Fessiers', path: 'M32,75 h36 v10 h-36 Z' },
  { key: 'jambes', label: 'Jambes', path: 'M30,85 h18 v45 h-18 Z M52,85 h18 v45 h-18 Z' },
]

export default function BodyDiagram({ selected, onToggle }: { selected: string[]; onToggle: (key: string) => void }) {
  return (
    <div className="flex items-center gap-5">
      <svg width="100" height="140" viewBox="0 0 100 140">
        <circle cx="50" cy="15" r="12" fill="var(--surface3)" stroke="var(--border)" />
        {ZONES.map((z) => (
          <path key={z.key} d={z.path}
            fill={selected.includes(z.key) ? '#F2C400' : 'var(--surface3)'}
            stroke="var(--border)" strokeWidth="1"
            onClick={() => onToggle(z.key)}
            style={{ cursor: 'pointer', transition: 'fill 0.15s' }} />
        ))}
      </svg>
      <div className="flex-1 flex flex-wrap gap-1.5">
        {ZONES.map((z) => (
          <button key={z.key} type="button" onClick={() => onToggle(z.key)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
            style={{
              background: selected.includes(z.key) ? '#F2C400' : 'var(--surface2)',
              color: selected.includes(z.key) ? '#0E0E0D' : 'var(--text-2)',
            }}>
            {z.label}
          </button>
        ))}
      </div>
    </div>
  )
}
