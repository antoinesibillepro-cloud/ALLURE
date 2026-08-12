import type { ReactNode, CSSProperties } from 'react'

export function Card({
  children,
  className = '',
  style,
  topo = false,
  lift = false,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  topo?: boolean
  lift?: boolean
}) {
  return (
    <div
      className={`rounded-3xl p-6 relative overflow-hidden ${topo ? 'topo-texture' : ''} ${lift ? 'card-lift cursor-pointer' : ''} ${className}`}
      style={{ background: 'var(--card)', boxShadow: 'var(--card-shadow)', ...style }}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: 'var(--text-2)' }}>
      {children}
    </p>
  )
}

export function BtnPrimary({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-press bg-[#F2C400] text-[#0E0E0D] font-bold text-sm py-3 px-5 rounded-[12px] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function BtnSecondary({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-press font-medium text-sm py-3 px-5 rounded-[12px] ${className}`}
      style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'transparent' }}
    >
      {children}
    </button>
  )
}

export function Avatar({
  initials,
  size = 36,
  yellow = false,
  online = false,
  src = null,
}: {
  initials: string
  size?: number
  yellow?: boolean
  online?: boolean
  src?: string | null
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-full font-black text-xs overflow-hidden"
        style={{
          width: size,
          height: size,
          background: yellow ? '#F2C400' : 'var(--avatar)',
          color: yellow ? '#0E0E0D' : 'var(--avatar-text)',
          fontSize: size < 32 ? 9 : 11,
          border: online ? '2px solid #F2C400' : undefined,
        }}
      >
        {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#5EBA65] rounded-full"
          style={{ border: '2px solid var(--bg)' }} />
      )}
    </div>
  )
}

export function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
export function IconChevronLeft({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export function IconChevronRight({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export function IconSearch({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
export function IconCheck({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2 7L5.5 10.5L12 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
