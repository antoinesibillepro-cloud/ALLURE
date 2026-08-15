import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchNextCompetition, fetchMyGroups } from '../lib/queries/profileExtras'

function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const duration = 900
    const start = performance.now()
    const raf = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [target])
  return <>{value}</>
}

/**
 * Right-hand desktop rail shared across athlete screens that don't already
 * build their own (Home and Training have bespoke versions) — challenges CTA,
 * groups, and next competition countdown, so every page gets the same
 * "dressed" desktop chrome instead of a bare single column.
 */
export default function AthleteDesktopRail() {
  const { profile } = useApp()

  const { data: myGroups } = useQuery(
    () => (profile ? fetchMyGroups(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: nextComp } = useQuery(
    () => (profile ? fetchNextCompetition(profile.id) : Promise.resolve(null)),
    [profile?.id],
  )
  const daysToComp = nextComp?.event_date
    ? Math.max(0, Math.ceil((new Date(nextComp.event_date).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="space-y-4">
      {/* Défis */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#F2C400] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="#0E0E0D" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--text-1)' }}>Défis</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Inscrivez-vous à un défi de course à pied pour gagner des badges.</p>
          </div>
        </div>
      </div>

      {/* Vos groupes */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>Vos groupes</p>
        {!myGroups?.length ? (
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>Tu n'es dans aucun groupe pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {myGroups.map((g) => (
              <div key={g.id} className="px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                {g.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prochaine compétition */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-2)' }}>Prochaine compétition</p>
        {!nextComp ? (
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Aucune compétition programmée</p>
        ) : (
          <>
            <p className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{nextComp.title}</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>
              {nextComp.distance_km ? `${nextComp.distance_km} km · ` : ''}
              {new Date(nextComp.event_date!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {nextComp.target_time ? ` · Objectif : ${nextComp.target_time}` : ''}
            </p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl py-3 text-center" style={{ background: 'var(--surface2)' }}>
                <p className="text-2xl font-black leading-none" style={{ color: '#F2C400' }}><AnimatedNumber target={daysToComp ?? 0} /></p>
                <p className="text-[8px] tracking-widest mt-1 font-semibold" style={{ color: 'var(--text-2)' }}>JOURS</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
