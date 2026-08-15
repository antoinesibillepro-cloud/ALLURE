import { useState, useEffect, useRef } from 'react'
import { Card, SectionLabel, Avatar } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchChallenges, fetchChallengeLeaderboard, fetchWeeklyRankings, type Challenge, type LeaderboardEntry, type WeeklyRankings } from '../lib/queries/community'
import { fetchClubActivityFeed, type ActivityItem } from '../lib/queries/coachStats'
import { fetchBadgeDefinitions, fetchEarnedBadges, computeAndAwardBadges, type BadgeDef, type EarnedBadge } from '../lib/queries/badges'
import AthleteDesktopSidebar from '../components/AthleteDesktopSidebar'
import AthleteDesktopRail from '../components/AthleteDesktopRail'

const KIND_LABEL: Record<string, string> = { km: 'km', sessions: 'séances', attendance: 'bilans' }

function IcBadgeFlame({ color = 'currentColor' }: { color?: string }) {
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2C8 2 11 5 11 8.5C11 10.4 9.7 12 8 12C6.3 12 5 10.4 5 8.5C5 7 6 6 6 6C6 6 6.5 8 8 8C8 8 7 6.5 8 2Z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function IcBadgeMountain({ color = 'currentColor' }: { color?: string }) {
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M1.5 13L6 5L9 9L11 7L14.5 13H1.5Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" /></svg>
}
function IcBadgeStar({ color = 'currentColor' }: { color?: string }) {
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2L9.5 6H14L10.5 8.5L12 12.5L8 10L4 12.5L5.5 8.5L2 6H6.5L8 2Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /></svg>
}
function IcBadgeTrophy({ color = 'currentColor' }: { color?: string }) {
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M5 2H11V8C11 10.2 9.2 12 7 12 4.8 12 3 10.2 3 8V2H5Z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 4H1.5C1.5 4 1 6 3 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" /><path d="M11 4H12.5C12.5 4 13 6 11 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" /><path d="M7 12V14M5 14H9" stroke={color} strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function IcBadgeLeaf({ color = 'currentColor' }: { color?: string }) {
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 13C3 13 2 6 8 3C14 3 13 9 13 9C10 12 5 12 3 13Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" /><path d="M4 12C6 10 8 8 11 5" stroke={color} strokeWidth="1.2" strokeLinecap="round" /></svg>
}
const BADGE_ICONS: Record<string, (c: string) => React.ReactNode> = {
  flame: (c) => <IcBadgeFlame color={c} />, mountain: (c) => <IcBadgeMountain color={c} />,
  star: (c) => <IcBadgeStar color={c} />, trophy: (c) => <IcBadgeTrophy color={c} />,
  leaf: (c) => <IcBadgeLeaf color={c} />,
}

function BadgesGrid({ profileId }: { profileId: string }) {
  const { data: defs } = useQuery<BadgeDef[]>(() => fetchBadgeDefinitions(), [])
  const { data: earned, refetch: refetchEarned } = useQuery<EarnedBadge[]>(() => fetchEarnedBadges(profileId), [profileId])
  useEffect(() => { computeAndAwardBadges(profileId).then(() => refetchEarned()) }, [profileId])
  const earnedMap = new Map((earned ?? []).map((e) => [e.badge_id, e.earned_at]))

  if (!defs?.length) return null
  return (
    <div>
      <SectionLabel>Badges &amp; récompenses</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mt-2">
        {defs.map((b) => {
          const earnedAt = earnedMap.get(b.id)
          const isEarned = !!earnedAt
          return (
            <div key={b.id} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
              style={{
                background: isEarned ? 'var(--card)' : 'var(--surface2)',
                boxShadow: isEarned ? 'var(--card-shadow)' : 'none',
                opacity: isEarned ? 1 : 0.45,
                border: isEarned ? '1px solid var(--border)' : '1px solid transparent',
              }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: isEarned ? 'rgba(242,196,0,0.12)' : 'var(--surface2)' }}>
                {BADGE_ICONS[b.icon_key]?.(isEarned ? '#F2C400' : 'var(--text-2)')}
              </div>
              <div>
                <p className="text-[10px] font-bold leading-tight" style={{ color: isEarned ? 'var(--text-1)' : 'var(--text-2)' }}>{b.title}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-2)' }}>{b.description}</p>
                {isEarned && earnedAt && (
                  <p className="text-[9px] font-semibold mt-1" style={{ color: '#F2C400' }}>
                    {new Date(earnedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const RANKING_LABEL: Record<keyof WeeklyRankings, string> = { km: 'Kilomètres', assiduite: 'Assiduité', recuperation: 'Récupération', sommeil: 'Défi sommeil', rapidite: "Défi d'assiduité" }
const RANKING_UNIT: Record<keyof WeeklyRankings, string> = { km: 'km', assiduite: '%', recuperation: '%', sommeil: 'h', rapidite: 'h' }

function IcTrophy({ color = 'currentColor', size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M5 2H11V8C11 10.2 9.2 12 7 12 4.8 12 3 10.2 3 8V2H5Z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4H1.5C1.5 4 1 6 3 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 4H12.5C12.5 4 13 6 11 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 12V14M5 14H9" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IcStar({ color = 'currentColor' }: { color?: string }) {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2L9.5 6H14L10.5 8.5L12 12.5L8 10L4 12.5L5.5 8.5L2 6H6.5L8 2Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /></svg>
}

function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const dur = 900
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return <>{value.toLocaleString('fr-FR')}</>
}

function HeroChallengeCard({ challenge, profileId, clubId, onViewRankings }: { challenge: Challenge; profileId: string; clubId: string; onViewRankings: () => void }) {
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>(
    () => fetchChallengeLeaderboard(challenge, clubId),
    [challenge.id],
  )
  const progressRef = useRef<HTMLDivElement>(null)
  const [progVisible, setProgVisible] = useState(false)
  useEffect(() => {
    const el = progressRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setProgVisible(true) }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const total = (leaderboard ?? []).reduce((s, l) => s + l.progress, 0)
  const pct = challenge.target_value > 0 ? Math.min(100, Math.round((total / challenge.target_value) * 100)) : 0
  const myIndex = (leaderboard ?? []).findIndex((l) => l.profileId === profileId)
  const me = myIndex >= 0 ? leaderboard![myIndex] : null
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000))

  return (
    <Card topo className="!p-0 overflow-hidden card-lift">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-[#F2C400] flex items-center justify-center">
                <IcTrophy color="#0E0E0D" size={12} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#F2C400' }}>Défi en cours</span>
            </div>
            <h2 className="text-xl font-black leading-snug" style={{ color: 'var(--text-1)' }}>{challenge.title}</h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Restants</p>
            <p className="text-3xl font-black leading-tight" style={{ color: 'var(--text-1)' }}>{daysLeft}</p>
            <p className="text-[9px]" style={{ color: 'var(--text-2)' }}>jours</p>
          </div>
        </div>
        <div ref={progressRef} className="mb-3">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-4xl font-black leading-none" style={{ color: 'var(--text-1)' }}>
                {challenge.kind === 'km' ? <AnimatedNumber target={Math.round(total)} /> : Math.round(total)}
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
                sur <span className="font-bold" style={{ color: 'var(--text-1)' }}>{challenge.target_value.toLocaleString('fr-FR')} {KIND_LABEL[challenge.kind]}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{ color: '#F2C400' }}>{pct}%</p>
              <p className="text-[9px]" style={{ color: 'var(--text-2)' }}>collectif</p>
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <div className="h-full rounded-full"
              style={{
                width: progVisible ? `${pct}%` : '0%',
                background: 'linear-gradient(90deg, #F2C400 0%, #FFD84D 100%)',
                transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
          </div>
        </div>
        {me && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{ background: 'rgba(242,196,0,0.1)', border: '1px solid rgba(242,196,0,0.18)' }}>
              <IcStar color="#F2C400" />
              <p className="text-xs font-bold" style={{ color: '#F2C400' }}>Tu es {myIndex + 1}{myIndex === 0 ? 'er' : 'e'} sur {leaderboard?.length ?? 0}</p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>· ta contribution : {me.progress.toFixed(challenge.kind === 'km' ? 1 : 0)} {KIND_LABEL[challenge.kind]}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>{leaderboard?.length ?? 0} participants · {challenge.group_id ? 'Groupe' : 'Club entier'}</p>
        <button onClick={onViewRankings}
          className="btn-press text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: '#F2C400', color: '#0E0E0D' }}>
          Voir le classement
        </button>
      </div>
    </Card>
  )
}

const MEDAL_COLOR: Record<number, string> = { 0: '#F2C400', 1: '#C7CDD6', 2: '#C4794F' }

function RankBadge({ rank }: { rank: number }) {
  const color = MEDAL_COLOR[rank]
  if (color) {
    return (
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
        style={{ background: color, color: '#0E0E0D' }}>{rank + 1}</span>
    )
  }
  return <span className="w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0" style={{ color: 'var(--text-2)' }}>{rank + 1}</span>
}

function RankingsTab({ rankings, profileId }: { rankings: WeeklyRankings | null | undefined; profileId: string }) {
  const keys: (keyof WeeklyRankings)[] = ['km', 'assiduite', 'recuperation', 'sommeil', 'rapidite']
  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const list = rankings?.[key] ?? []
        return (
          <Card key={key}>
            <SectionLabel>{RANKING_LABEL[key]}</SectionLabel>
            {!list.length ? (
              <p className="text-sm text-center py-3" style={{ color: 'var(--text-2)' }}>Pas encore de données cette semaine.</p>
            ) : (
              <div className="space-y-1 mt-2">
                {list.slice(0, 8).map((l, i) => (
                  <div key={l.profileId} className="flex items-center gap-2.5 py-1.5 rounded-xl px-1.5"
                    style={{ background: l.profileId === profileId ? 'rgba(242,196,0,0.08)' : 'transparent' }}>
                    <RankBadge rank={i} />
                    <Avatar initials={l.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: l.profileId === profileId ? '#F2C400' : 'var(--text-1)', fontWeight: l.profileId === profileId ? 700 : 500 }}>
                        {l.name}{l.profileId === profileId ? ' (Toi)' : ''}
                      </p>
                      {l.category && <p className="text-[11px] truncate" style={{ color: 'var(--text-2)' }}>{l.category}</p>}
                    </div>
                    <span className="text-sm font-black" style={{ color: 'var(--text-1)' }}>{l.value}<span className="text-xs font-semibold ml-0.5" style={{ color: 'var(--text-2)' }}>{RANKING_UNIT[key]}</span></span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function ChallengeCard({ challenge, profileId, clubId }: { challenge: Challenge; profileId: string; clubId: string }) {
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>(
    () => fetchChallengeLeaderboard(challenge, clubId),
    [challenge.id],
  )
  const isActive = challenge.end_date >= new Date().toISOString().slice(0, 10)
  const me = leaderboard?.find((l) => l.profileId === profileId)
  const myRank = leaderboard?.findIndex((l) => l.profileId === profileId)
  const pct = me ? Math.min(100, (me.progress / challenge.target_value) * 100) : 0

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{challenge.title}</p>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
            {new Date(challenge.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → {new Date(challenge.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        {!isActive && <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>TERMINÉ</span>}
      </div>
      <p className="text-xs mb-1" style={{ color: 'var(--text-2)' }}>
        Ta progression : <span className="font-bold" style={{ color: 'var(--text-1)' }}>{(me?.progress ?? 0).toFixed(challenge.kind === 'km' ? 1 : 0)} / {challenge.target_value} {KIND_LABEL[challenge.kind]}</span>
        {myRank !== undefined && myRank >= 0 && <span> · {myRank + 1}{myRank === 0 ? 'er' : 'e'} du classement</span>}
      </p>
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#F2C400' }} />
      </div>
      {leaderboard && leaderboard.length > 0 && (
        <div className="space-y-1.5">
          {leaderboard.slice(0, 5).map((l, i) => (
            <div key={l.profileId} className="flex items-center gap-2">
              <span className="text-xs w-4 text-center font-bold" style={{ color: i < 3 ? '#F2C400' : 'var(--text-2)' }}>{i + 1}</span>
              <Avatar initials={l.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={24} />
              <span className="text-xs flex-1" style={{ color: l.profileId === profileId ? '#F2C400' : 'var(--text-1)' }}>{l.name}</span>
              <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{l.progress.toFixed(challenge.kind === 'km' ? 1 : 0)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function CommunityScreen() {
  const { profile } = useApp()
  const [tab, setTab] = useState<'defis' | 'classements' | 'feed'>('defis')

  const { data: challenges } = useQuery<Challenge[]>(
    () => (profile ? fetchChallenges(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: feed } = useQuery<ActivityItem[]>(
    () => (profile ? fetchClubActivityFeed(profile.club_id, 15) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: rankings } = useQuery<WeeklyRankings>(
    () => (profile ? fetchWeeklyRankings(profile.club_id) : Promise.resolve({ km: [], assiduite: [], recuperation: [], sommeil: [], rapidite: [] })),
    [profile?.club_id],
  )

  const today = new Date().toISOString().slice(0, 10)
  const active = challenges?.filter((c) => c.end_date >= today) ?? []
  const past = challenges?.filter((c) => c.end_date < today) ?? []
  const heroChallenge = [...active].sort((a, b) => a.end_date.localeCompare(b.end_date))[0] ?? null
  const otherActive = active.filter((c) => c.id !== heroChallenge?.id)

  const content = (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Communauté</h1>
      </div>

      {heroChallenge && profile && (
        <HeroChallengeCard challenge={heroChallenge} profileId={profile.id} clubId={profile.club_id} onViewRankings={() => setTab('classements')} />
      )}

      <div className="flex gap-1 p-0.5 rounded-2xl w-fit" style={{ background: 'var(--surface2)' }}>
        {([{ id: 'defis' as const, label: 'Défis' }, { id: 'classements' as const, label: 'Classements' }, { id: 'feed' as const, label: 'Fil du club' }]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: tab === t.id ? 'var(--card)' : 'transparent', color: tab === t.id ? 'var(--text-1)' : 'var(--text-2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'classements' && profile && <RankingsTab rankings={rankings} profileId={profile.id} />}

      {tab === 'defis' && (
        <div className="space-y-3">
          {!active.length && (
            <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucun défi en cours. Ton coach peut en créer un depuis son espace.</p></Card>
          )}
          {otherActive.length > 0 && <SectionLabel>Autres défis en cours</SectionLabel>}
          {otherActive.map((c) => profile && <ChallengeCard key={c.id} challenge={c} profileId={profile.id} clubId={profile.club_id} />)}

          {past.length > 0 && (
            <>
              <SectionLabel>Défis passés</SectionLabel>
              {past.map((c) => profile && <ChallengeCard key={c.id} challenge={c} profileId={profile.id} clubId={profile.club_id} />)}
            </>
          )}

          {profile && <BadgesGrid profileId={profile.id} />}
        </div>
      )}

      {tab === 'feed' && (
        <Card>
          {!feed?.length ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucune activité pour l'instant.</p>
          ) : (
            <div className="space-y-0">
              {feed.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <Avatar initials={item.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                      <span className="font-semibold">{item.name}</span> <span style={{ color: 'var(--text-2)' }}>{item.action}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{item.detail}</p>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--text-2)' }}>{item.time}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )

  return (
    <>
      <div className="lg:hidden">{content}</div>
      <div className="hidden lg:block" style={{ background: 'var(--bg)' }}>
        <div className="max-w-[1320px] mx-auto px-4 py-6">
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '240px 1fr 300px' }}>
            <AthleteDesktopSidebar />
            <div>{content}</div>
            <AthleteDesktopRail />
          </div>
        </div>
      </div>
    </>
  )
}
