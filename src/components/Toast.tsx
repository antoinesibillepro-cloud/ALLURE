import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const KIND_COLOR: Record<ToastKind, string> = { success: '#5EBA65', error: '#E4574A', info: '#F2C400' }

const Ctx = createContext<{ toast: (message: string, kind?: ToastKind) => void }>({ toast: () => {} })

/** Fire a transient confirmation/error banner: `toast('Séance publiée')`. */
export function useToast() {
  return useContext(Ctx).toast
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  const c = KIND_COLOR[kind]
  if (kind === 'success') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7L5.5 10.5L12 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'error') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 2L12 12M12 2L2 12" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.5" />
      <path d="M7 4.2V7.4M7 9.6V9.8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, kind, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none
        top-4 lg:top-[72px]">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in glass-capsule rounded-full pl-3 pr-4 py-2.5 flex items-center gap-2.5 max-w-[90vw]">
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${KIND_COLOR[t.kind]}22` }}>
              <ToastIcon kind={t.kind} />
            </span>
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>{t.message}</p>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
