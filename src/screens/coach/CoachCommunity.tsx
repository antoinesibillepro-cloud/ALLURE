import { useState, useEffect, useRef } from 'react'
import { Card, SectionLabel, BtnPrimary, Avatar } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchChallenges, createChallenge, deleteChallenge, fetchChallengeLeaderboard, fetchWeeklyRankings, type Challenge, type ChallengeKind, type LeaderboardEntry, type WeeklyRankings } from '../../lib/queries/community'
import { fetchGroups, type GroupWithMembers } from '../../lib/queries/groups'
import { fetchClubActivityFeed, type ActivityItem } from '../../lib/queries/coachStats'

const KIND_LABEL: Record<string, string> = { km: 'km', sessions: 'séances', attendance: 'bilans' }
const RANKING_LABEL: Record<keyof WeeklyRankings, string> = { km: 'Kilomètres', assiduite: 'Assiduité', recuperation: 'Récupération', sommeil: 'Défi sommeil', rapidite: "Défi d'assiduité" }
const RANKING_UNIT: Record<keyof WeeklyRankings, string> = { km: 'km', assiduite: '%', recuperation: '%', sommeil: 'h', rapidite: 'h' }
const MEDAL_COLOR: Record<number, string> = { 0: '#F2C400', 1: '#C7CDD6', 2: '#C4794F' }

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

function HeroChallengeCard({ challenge, clubId, onViewRankings }: { challenge: Challenge; clubId: string; onViewRankings: () => void }) {
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
              <p className="text-4xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{total.toFixed(challenge.kind === 'km' ? 1 : 0)}</p>
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

function RankingsTab({ rankings }: { rankings: WeeklyRankings | null | undefined }) {
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
                  <div key={l.profileId} className="flex items-center gap-2.5 py-1.5 rounded-xl px-1.5">
                    <RankBadge rank={i} />
                    <Avatar initials={l.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium" style={{ color: 'var(--text-1)' }}>{l.name}</p>
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

function ChallengeRow({ challenge, clubId, onDelete }: { challenge: Challenge; clubId: string; onDelete: () => void }) {
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>(
    () => fetchChallengeLeaderboard(challenge, clubId),
    [challenge.id],
  )
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{challenge.title}</p>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
            Objectif {challenge.target_value} {KIND_LABEL[challenge.kind]} · {new Date(challenge.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → {new Date(challenge.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button onClick={onDelete} className="text-xs font-semibold text-[#E4574A]">supprimer</button>
      </div>
      {leaderboard && leaderboard.length > 0 && (
        <div className="space-y-1.5 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {leaderboard.slice(0, 5).map((l, i) => (
            <div key={l.profileId} className="flex items-center gap-2">
              <span className="text-xs w-4 text-center font-bold" style={{ color: i < 3 ? '#F2C400' : 'var(--text-2)' }}>{i + 1}</span>
              <Avatar initials={l.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={24} />
              <span className="text-xs flex-1" style={{ color: 'var(--text-1)' }}>{l.name}</span>
              <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{l.progress.toFixed(challenge.kind === 'km' ? 1 : 0)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function CoachCommunity() {
  const { profile } = useApp()
  const [tab, setTab] = useState<'defis' | 'classements' | 'feed'>('defis')
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ChallengeKind>('km')
  const [target, setTarget] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [groupId, setGroupId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const { data: challenges, refetch } = useQuery<Challenge[]>(
    () => (profile ? fetchChallenges(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: groups } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
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

  async function handleCreate() {
    if (!profile || !title.trim() || !target || !endDate) return
    setSaving(true)
    try {
      await createChallenge(profile.club_id, profile.id, {
        title: title.trim(), kind, target_value: parseFloat(target),
        start_date: startDate, end_date: endDate, group_id: groupId || null,
      })
      setTitle(''); setTarget(''); setEndDate(''); setGroupId('')
      setShowCreate(false)
      await refetch()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteChallenge(id)
    await refetch()
  }

  const today = new Date().toISOString().slice(0, 10)
  const active = (challenges ?? []).filter((c) => c.end_date >= today)
  const heroChallenge = [...active].sort((a, b) => a.end_date.localeCompare(b.end_date))[0] ?? null
  const otherChallenges = (challenges ?? []).filter((c) => c.id !== heroChallenge?.id)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Communauté</h1>
        <BtnPrimary className="text-xs !py-2 !px-3" onClick={() => setShowCreate((v) => !v)}>+ Créer un défi</BtnPrimary>
      </div>

      {showCreate && (
        <Card className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Titre du défi</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: 100km en août"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Type d&apos;objectif</label>
            <div className="flex gap-2">
              {(['km', 'sessions', 'attendance'] as ChallengeKind[]).map((k) => (
                <button key={k} onClick={() => setKind(k)} className="flex-1 py-2 rounded-[10px] text-xs font-bold capitalize"
                  style={{ background: kind === k ? '#F2C400' : 'var(--surface2)', color: kind === k ? '#0E0E0D' : 'var(--text-2)' }}>
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Objectif ({KIND_LABEL[kind]})</label>
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Ex: 100" inputMode="numeric"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Début</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Participants</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
              <option value="">Tout le club</option>
              {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <BtnPrimary onClick={handleCreate} disabled={saving || !title.trim() || !target || !endDate}>
              {saving ? '…' : 'Créer le défi'}
            </BtnPrimary>
            <button onClick={() => setShowCreate(false)} className="text-sm font-semibold px-4" style={{ color: 'var(--text-2)' }}>Annuler</button>
          </div>
        </Card>
      )}

      {heroChallenge && profile && (
        <HeroChallengeCard challenge={heroChallenge} clubId={profile.club_id} onViewRankings={() => setTab('classements')} />
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

      {tab === 'classements' && <RankingsTab rankings={rankings} />}

      {tab === 'defis' && (
        <div className="space-y-3">
          {!challenges?.length ? (
            <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucun défi pour l'instant.</p></Card>
          ) : (
            otherChallenges.map((c) => profile && <ChallengeRow key={c.id} challenge={c} clubId={profile.club_id} onDelete={() => handleDelete(c.id)} />)
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
