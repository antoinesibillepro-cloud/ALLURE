import { useState } from 'react'
import { Card, SectionLabel, Avatar } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchChallenges, fetchChallengeLeaderboard, type Challenge, type LeaderboardEntry } from '../lib/queries/community'
import { fetchClubActivityFeed, type ActivityItem } from '../lib/queries/coachStats'

const KIND_LABEL: Record<string, string> = { km: 'km', sessions: 'séances', attendance: 'bilans' }

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
  const [tab, setTab] = useState<'defis' | 'feed'>('defis')

  const { data: challenges } = useQuery<Challenge[]>(
    () => (profile ? fetchChallenges(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: feed } = useQuery<ActivityItem[]>(
    () => (profile ? fetchClubActivityFeed(profile.club_id, 15) : Promise.resolve([])),
    [profile?.club_id],
  )

  const today = new Date().toISOString().slice(0, 10)
  const active = challenges?.filter((c) => c.end_date >= today) ?? []
  const past = challenges?.filter((c) => c.end_date < today) ?? []

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Communauté</h1>
      </div>

      <div className="flex gap-1 p-0.5 rounded-2xl w-fit" style={{ background: 'var(--surface2)' }}>
        {([{ id: 'defis' as const, label: 'Défis' }, { id: 'feed' as const, label: 'Activité' }]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: tab === t.id ? 'var(--card)' : 'transparent', color: tab === t.id ? 'var(--text-1)' : 'var(--text-2)' }}>
            {t.label}
          </button>
        ))}
      </div>

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
}
