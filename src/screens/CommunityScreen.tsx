import { useState, useEffect } from 'react'
import { Card, SectionLabel, Avatar } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchChallenges, fetchChallengeLeaderboard, fetchWeeklyRankings, type Challenge, type LeaderboardEntry, type WeeklyRankings } from '../lib/queries/community'
import { fetchClubActivityFeed, type ActivityItem } from '../lib/queries/coachStats'
import { fetchBadgeDefinitions, fetchEarnedBadges, computeAndAwardBadges, type BadgeDef, type EarnedBadge } from '../lib/queries/badges'
import AthleteDesktopSidebar from '../components/AthleteDesktopSidebar'

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

const RANKING_LABEL: Record<keyof WeeklyRankings, string> = { km: 'Kilomètres', assiduite: 'Assiduité', recuperation: 'Récupération' }
const RANKING_UNIT: Record<keyof WeeklyRankings, string> = { km: 'km', assiduite: '%', recuperation: '%' }

function ClubKmBanner({ rankings }: { rankings: WeeklyRankings | null | undefined }) {
  const total = (rankings?.km ?? []).reduce((s, e) => s + e.value, 0)
  return (
    <Card className="text-center !py-6" style={{ background: '#0E0E0D' }}>
      <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#F2C400' }}>Cumul du club cette semaine</p>
      <p className="text-4xl font-black mt-1" style={{ color: '#FFFFFF' }}>{total.toFixed(1)}<span className="text-lg font-bold ml-1" style={{ color: '#F2C400' }}>km</span></p>
    </Card>
  )
}

function RankingsTab({ rankings, profileId }: { rankings: WeeklyRankings | null | undefined; profileId: string }) {
  const keys: (keyof WeeklyRankings)[] = ['km', 'assiduite', 'recuperation']
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
              <div className="space-y-1.5 mt-2">
                {list.slice(0, 8).map((l, i) => (
                  <div key={l.profileId} className="flex items-center gap-2">
                    <span className="text-xs w-4 text-center font-bold" style={{ color: i < 3 ? '#F2C400' : 'var(--text-2)' }}>{i + 1}</span>
                    <Avatar initials={l.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={24} />
                    <span className="text-xs flex-1" style={{ color: l.profileId === profileId ? '#F2C400' : 'var(--text-1)' }}>{l.name}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{l.value}{RANKING_UNIT[key]}</span>
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
    () => (profile ? fetchWeeklyRankings(profile.club_id) : Promise.resolve({ km: [], assiduite: [], recuperation: [] })),
    [profile?.club_id],
  )

  const today = new Date().toISOString().slice(0, 10)
  const active = challenges?.filter((c) => c.end_date >= today) ?? []
  const past = challenges?.filter((c) => c.end_date < today) ?? []

  const content = (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Communauté</h1>
      </div>

      <ClubKmBanner rankings={rankings} />

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
          {active.map((c) => profile && <ChallengeCard key={c.id} challenge={c} profileId={profile.id} clubId={profile.club_id} />)}

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
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '240px 1fr' }}>
            <AthleteDesktopSidebar />
            <div>{content}</div>
          </div>
        </div>
      </div>
    </>
  )
}
