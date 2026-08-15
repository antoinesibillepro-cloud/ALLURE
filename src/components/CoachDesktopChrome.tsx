import type { ReactNode } from 'react'
import { useApp } from '../context/AppContext'
import CoachDesktopSidebar from './CoachDesktopSidebar'
import CoachCommunityRail from './CoachCommunityRail'

/**
 * Shared desktop chrome for coach screens that otherwise render identically on
 * mobile and desktop: profile sidebar on the left, the screen's own content
 * in the middle, ambient community/stats rail on the right — same dressing
 * as the coach Dashboard and the athlete-facing screens, applied consistently.
 * Mobile is untouched (renders children directly, no extra markup).
 */
export default function CoachDesktopChrome({ onOpenCommunity, onOpenStats, children }: {
  onOpenCommunity: () => void
  onOpenStats: () => void
  children: ReactNode
}) {
  const { profile } = useApp()

  return (
    <>
      <div className="lg:hidden">{children}</div>
      <div className="hidden lg:block" style={{ background: 'var(--bg)' }}>
        <div className="max-w-[1320px] mx-auto px-4 py-6">
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '240px 1fr 300px' }}>
            <CoachDesktopSidebar />
            <div>{children}</div>
            <CoachCommunityRail clubId={profile?.club_id ?? ''} onOpenCommunity={onOpenCommunity} onOpenStats={onOpenStats} />
          </div>
        </div>
      </div>
    </>
  )
}
