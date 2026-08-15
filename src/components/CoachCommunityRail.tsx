import { useQuery } from '../lib/useQuery'
import { fetchChallenges, fetchChallengeLeaderboard, fetchWeeklyRankings, type Challenge, type LeaderboardEntry, type WeeklyRankings } from '../lib/queries/community'
import { fetchClubKpis } from '../lib/queries/coachStats'
import { Avatar } from './ui'

const MEDAL_COLOR: Record<number, string> = { 0: '#F2C400', 1: '#C7CDD6', 2: '#C4794F' }

function ChallengeMini({ challenge, clubId }: { challenge: Challenge; clubId: string }) {
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>(() => fetchChallengeLeaderboard(challenge, clubId), [challenge.id])
  const total = (leaderboard ?? []).reduce((s, l) => s + l.progress, 0)
  const pct = challenge.target_value > 0 ? Math.min(100, Math.round((total / challenge.target_value) * 100)) : 0
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000))

  return (
    <div className="px-4 pt-4 pb-3">
      <p className="text-sm font-black leading-snug mb-2" style={{ color: 'var(--text-1)' }}>{challenge.title}</p>
      <div className="flex items-end justify-between mb-1.5">
        <p className="text-xl font-black leading-none" style={{ color: 'var(--text-1)' }}>
          {total.toFixed(challenge.kind === 'km' ? 1 : 0)}
          <span className="text-xs font-medium ml-1" style={{ color: 'var(--text-2)' }}>/ {challenge.target_value}</span>
        </p>
        <span className="text-xs font-bold" style={{ color: '#F2C400' }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F2C400 0%, #FFD84D 100%)' }} />
      </div>
      <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>{daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}</p>
    </div>
  )
}

/**
 * Right-hand desktop rail for the coach dashboard: ambient community widgets
 * (active challenge, weekly km ranking) plus a link into detailed club
 * stats — the athlete-Home-style substitute for the retired top-nav tabs.
 */
export default function CoachCommunityRail({ clubId, onOpenCommunity, onOpenStats }: {
  clubId: string
  onOpenCommunity: () => void
  onOpenStats: () => void
}) {
  const { data: challenges } = useQuery<Challenge[]>(() => fetchChallenges(clubId), [clubId])
  const { data: rankings } = useQuery<WeeklyRankings>(
    () => fetchWeeklyRankings(clubId),
    [clubId],
  )
  const { data: kpis } = useQuery(() => fetchClubKpis(clubId), [clubId])

  const today = new Date().toISOString().slice(0, 10)
  const active = (challenges ?? []).filter((c) => c.end_date >= today)
  const heroChallenge = [...active].sort((a, b) => a.end_date.localeCompare(b.end_date))[0] ?? null
  const topKm = (rankings?.km ?? []).slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Défi en cours */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        {heroChallenge ? (
          <ChallengeMini challenge={heroChallenge} clubId={clubId} />
        ) : (
          <div className="px-4 py-4">
            <p className="text-sm font-black" style={{ color: 'var(--text-1)' }}>Communauté</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Aucun défi en cours.</p>
          </div>
        )}
        <button onClick={onOpenCommunity}
          className="btn-press w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold"
          style={{ color: '#F2C400', background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
          Voir la communauté
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 3L7.5 6L4.5 9" stroke="#F2C400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Classement km de la semaine */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '16px' }}>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>Top km — cette semaine</p>
        {!topKm.length ? (
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>Pas encore de données cette semaine.</p>
        ) : (
          <div className="space-y-2">
            {topKm.map((l, i) => (
              <div key={l.profileId} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                  style={{ background: MEDAL_COLOR[i] ?? 'var(--surface2)', color: MEDAL_COLOR[i] ? '#0E0E0D' : 'var(--text-2)' }}>
                  {i + 1}
                </span>
                <Avatar initials={l.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={26} />
                <span className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--text-1)' }}>{l.name}</span>
                <span className="text-sm font-black" style={{ color: 'var(--text-1)' }}>{l.value}<span className="text-[10px] font-semibold ml-0.5" style={{ color: 'var(--text-2)' }}>km</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lien stats club */}
      <button onClick={onOpenStats}
        className="btn-press w-full flex items-center justify-between px-4 py-3.5"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)' }}>
        <div className="text-left">
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Statistiques du club</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
            {kpis?.sessionsPublished ?? 0} séances publiées cette semaine
          </p>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3L9 7L5 11" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
