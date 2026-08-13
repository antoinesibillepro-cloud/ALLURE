import { useEffect, useRef, useState } from 'react'

/** Shimmering placeholder block — use while a query is loading instead of a blank screen. */
export function Skeleton({ w = '100%', h = 14, r = 8, className = '' }: { w?: string | number; h?: number; r?: number; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ width: w, height: h, borderRadius: r }} />
}

/** A few stacked skeleton rows, matching the avatar + two-line layout used across list cards. */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-0 mt-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Skeleton w={36} h={36} r={999} />
          <div className="flex-1 space-y-1.5">
            <Skeleton w={`${55 + ((i * 13) % 25)}%`} h={12} />
            <Skeleton w={`${30 + ((i * 17) % 20)}%`} h={10} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Counts up to `value` on mount/changes — used for dashboard KPI numbers. */
export function CountUp({ value, duration = 700, className = '', style }: {
  value: number
  duration?: number
  className?: string
  style?: React.CSSProperties
}) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const delta = value - from
    if (delta === 0) return
    let raf = 0
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      // easeOutCubic — fast start, gentle settle
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + delta * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span className={className} style={style}>{display}</span>
}
