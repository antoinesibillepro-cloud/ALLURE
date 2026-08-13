import { useEffect, useRef, useState } from 'react'
import { fetchNotifications, type NotifItem, type NotifKind } from '../lib/queries/notificationsFeed'
import { Skeleton } from './Skeleton'

const KIND_COLOR: Record<NotifKind, string> = { message: '#F2C400', session: '#5B91D8', race: '#5EBA65' }

function KindIcon({ kind }: { kind: NotifKind }) {
  const c = KIND_COLOR[kind]
  if (kind === 'message') {
    return (
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
        <path d="M17 3H3C2.4 3 2 3.4 2 4V13C2 13.6 2.4 14 3 14H8L10 17.5L12 14H17C17.6 14 18 13.6 18 13V4C18 3.4 17.6 3 17 3Z"
          stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'session') {
    return (
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke={c} strokeWidth="1.8" />
        <path d="M10 6V10.5L13.5 12.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z"
        stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function IcBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1C5.8 1 4 3 4 5.5V9L2 11V12H14V11L12 9V5.5C12 3 10.2 1 8 1Z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M6.5 13.5C6.5 14.3 7.2 15 8 15C8.8 15 9.5 14.3 9.5 13.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  )
}

/**
 * Topbar bell showing a real feed: unread conversations, upcoming sessions and races.
 * The dot only appears when there is something to see.
 */
export default function NotificationBell({ profileId, clubId, isCoach, onPick }: {
  profileId: string
  clubId: string
  isCoach: boolean
  onPick: (kind: NotifKind) => void
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(true)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchNotifications(profileId, clubId, isCoach)
      .then((r) => { if (!cancelled) setItems(r) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profileId, clubId, isCoach, open])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const unreadMessages = items.filter((i) => i.kind === 'message').length

  return (
    <div ref={boxRef} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="btn-press relative w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: open ? 'var(--surface3)' : 'var(--surface2)', color: 'var(--text-2)' }}>
        <IcBell />
        {unreadMessages > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E4574A] rounded-full" />
        )}
      </button>

      {open && (
        <div className="pop-in absolute top-full mt-2 right-0 w-[320px] rounded-2xl overflow-hidden z-50"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.28)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-2)' }}>
              Notifications
            </p>
          </div>

          {loading ? (
            <div className="p-3 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton w={28} h={28} r={999} />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton w="65%" h={11} />
                    <Skeleton w="40%" h={9} />
                  </div>
                </div>
              ))}
            </div>
          ) : !items.length ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-2)' }}>Rien de neuf.</p>
          ) : (
            <div className="max-h-[380px] overflow-y-auto py-1">
              {items.map((n, i) => (
                <button key={n.id} onClick={() => { onPick(n.kind); setOpen(false) }}
                  className="row-in row-press w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
                  style={{ animationDelay: `${Math.min(i * 30, 210)}ms` }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${KIND_COLOR[n.kind]}1f` }}>
                    <KindIcon kind={n.kind} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>{n.title}</span>
                    <span className="block text-[11px] truncate" style={{ color: 'var(--text-2)' }}>{n.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
