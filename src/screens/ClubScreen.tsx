import { useState } from 'react'
import { Card, SectionLabel, Avatar } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchClubActivityFeed, type ActivityItem } from '../lib/queries/coachStats'
import { fetchClubName, createCompetition, deleteCompetition } from '../lib/queries/profileExtras'
import {
  fetchClubLeaderboards, fetchClubRecentRecords, fetchClubCompetitions,
  type LeaderKey, type LeaderRow, type ClubRecord, type ClubCompetitionEvent,
} from '../lib/queries/club'
import AthleteDesktopSidebar from '../components/AthleteDesktopSidebar'

type ClubTab = 'feed' | 'classements' | 'competitions'

// ── Icons ─────────────────────────────────────────────────────────────────

function IcRun({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="10" cy="3" r="1.5" fill={color} />
      <path d="M6.5 5.5L8.5 4L10 7L7.5 9L8 12.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9.5L6 8.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 12.5L6 13.5M8 12.5L10 13" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IcTrophy({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 2H11V8C11 10.2 9.2 12 7 12 4.8 12 3 10.2 3 8V2H5Z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4H1.5C1.5 4 1 6 3 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 4H12.5C12.5 4 13 6 11 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 12V14M5 14H9" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IcLocation({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1C4.3 1 3 2.3 3 4C3 6.5 6 11 6 11C6 11 9 6.5 9 4C9 2.3 7.7 1 6 1Z" stroke={color} strokeWidth="1.2" />
      <circle cx="6" cy="4" r="1.2" fill={color} />
    </svg>
  )
}
function IcFeed({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4H14M2 8H10M2 12H7" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IcPodium({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="9" width="3.5" height="5" rx="0.5" stroke={c} strokeWidth="1.3" />
      <rect x="6.25" y="6" width="3.5" height="8" rx="0.5" stroke={c} strokeWidth="1.3" />
      <rect x="10.5" y="11" width="3.5" height="3" rx="0.5" stroke={c} strokeWidth="1.3" />
    </svg>
  )
}
function IcCal({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="11" rx="1.5" stroke={c} strokeWidth="1.3" />
      <path d="M5 2V5M11 2V5M2 7H14" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 10H5.5M8 10H8.5M11 10H11.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function currentSeasonLabel() {
  const now = new Date()
  const year = now.getFullYear()
  const startYear = now.getMonth() >= 6 ? year : year - 1 // season flips in July
  return `Saison ${startYear}–${String((startYear + 1) % 100).padStart(2, '0')}`
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: '#F2C400', text: '#0E0E0D' },
    2: { bg: '#B8C0C8', text: '#0E0E0D' },
    3: { bg: '#C48A4F', text: '#FFFFFF' },
  }
  const c = colors[rank] ?? { bg: 'var(--surface2)', text: 'var(--text-2)' }
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
      style={{ background: c.bg, color: c.text }}>
      {rank}
    </div>
  )
}

// ── Feed ──────────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: ActivityItem }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Avatar initials={initialsOf(item.name)} size={38} />
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: 'var(--text-1)' }}>
              <span className="font-bold">{item.name}</span> <span style={{ color: 'var(--text-2)' }}>{item.action}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{item.time}</p>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(94,186,101,0.1)' }}>
            <IcRun color="#5EBA65" />
          </div>
        </div>
        {item.detail && (
          <p className="text-sm font-medium mt-3" style={{ color: 'var(--text-1)' }}>{item.detail}</p>
        )}
      </div>
    </Card>
  )
}

// ── Leaderboard section ───────────────────────────────────────────────────

const LEADERBOARD_LABELS: Record<LeaderKey, string> = {
  assiduite: 'Assiduité',
  kilometrage: 'Kilométrage',
  vma: 'VMA',
}

function LeaderboardSection({ clubId }: { clubId: string }) {
  const [activeLeader, setActiveLeader] = useState<LeaderKey>('assiduite')
  const { data: boards, loading } = useQuery<Record<LeaderKey, LeaderRow[]>>(
    () => fetchClubLeaderboards(clubId),
    [clubId],
  )
  const { data: records } = useQuery<ClubRecord[]>(
    () => fetchClubRecentRecords(clubId, 6),
    [clubId],
  )
  const data = boards?.[activeLeader] ?? []

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface2)' }}>
        {(Object.keys(LEADERBOARD_LABELS) as LeaderKey[]).map((k) => (
          <button key={k} onClick={() => setActiveLeader(k)}
            className="btn-press flex-1 text-[10px] font-semibold py-2 rounded-lg transition-all tracking-wide"
            style={{
              background: activeLeader === k ? 'var(--card)' : 'transparent',
              color: activeLeader === k ? 'var(--text-1)' : 'var(--text-2)',
              boxShadow: activeLeader === k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {LEADERBOARD_LABELS[k]}
          </button>
        ))}
      </div>

      <Card>
        {!loading && data.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Pas encore de données pour ce classement.</p>
        )}
        {data.map((row, i) => (
          <div key={row.profileId} className="flex items-center gap-3 py-3"
            style={{ borderBottom: i < data.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <RankBadge rank={i + 1} />
            <Avatar initials={initialsOf(row.name)} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{row.name}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>{row.groupName}</p>
            </div>
            <p className="text-lg font-black tabular-nums" style={{ color: i === 0 ? '#F2C400' : 'var(--text-1)' }}>
              {row.value}
              <span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-2)' }}>{row.unit}</span>
            </p>
          </div>
        ))}
      </Card>

      <SectionLabel>Records du club</SectionLabel>
      {!records?.length ? (
        <Card><p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucun record enregistré pour l&apos;instant.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {records.map((rec) => (
            <div key={rec.id} className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: rec.isSeasonBest ? 'rgba(242,196,0,0.15)' : 'var(--surface2)' }}>
                <IcTrophy color={rec.isSeasonBest ? '#F2C400' : 'var(--text-2)'} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: 'var(--text-1)' }}>{rec.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>{rec.discipline}</p>
                <p className="text-sm font-black mt-0.5" style={{ color: '#F2C400' }}>{rec.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Competitions section ───────────────────────────────────────────────────

function formatEventDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }),
    daysLeft: Math.max(0, Math.round((d.getTime() - Date.now()) / (24 * 3600 * 1000))),
  }
}

function CompetitionsSection({ clubId, profileId }: { clubId: string; profileId: string }) {
  const { data: competitions, refetch } = useQuery<ClubCompetitionEvent[]>(
    () => fetchClubCompetitions(clubId),
    [clubId],
  )
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAdd() {
    if (!title.trim() || !eventDate) return
    setBusy(true)
    try {
      await createCompetition(profileId, {
        kind: 'competition',
        title: title.trim(),
        event_date: eventDate,
        distance_km: distanceKm ? Number(distanceKm) : null,
        target_time: null,
      })
      setTitle(''); setEventDate(''); setDistanceKm(''); setShowForm(false)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(event: ClubCompetitionEvent) {
    setBusy(true)
    try {
      await createCompetition(profileId, {
        kind: 'competition',
        title: event.title,
        event_date: event.eventDate,
        distance_km: event.distanceKm,
        target_time: event.targetTime,
      })
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  async function handleUnregister(competitionId: string) {
    setBusy(true)
    try {
      await deleteCompetition(competitionId)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Calendrier du club</SectionLabel>
        <button onClick={() => setShowForm((v) => !v)} className="btn-press text-xs font-semibold px-3 py-1.5 rounded-xl"
          style={{ background: '#F2C400', color: '#0E0E0D' }}>
          {showForm ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {showForm && (
        <Card className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de la compétition"
            className="w-full text-sm px-3 py-2 rounded-xl" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
          <div className="flex gap-2">
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
              className="flex-1 text-sm px-3 py-2 rounded-xl" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
            <input type="number" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="km"
              className="w-20 text-sm px-3 py-2 rounded-xl" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
          </div>
          <button onClick={handleAdd} disabled={busy || !title.trim() || !eventDate}
            className="btn-press w-full text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-40"
            style={{ background: '#F2C400', color: '#0E0E0D' }}>
            Créer et s&apos;inscrire
          </button>
        </Card>
      )}

      {!competitions?.length && !showForm && (
        <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucune compétition à venir. Ajoute la tienne pour inviter le club à s&apos;inscrire.</p></Card>
      )}

      {competitions?.map((comp) => {
        const { day, month, daysLeft } = formatEventDate(comp.eventDate)
        const mine = comp.registrants.find((r) => r.profileId === profileId)
        return (
          <Card key={comp.key} className="!p-0 overflow-hidden card-lift">
            <div className="flex">
              <div className="flex flex-col items-center justify-center px-5 py-5 shrink-0"
                style={{ background: 'var(--surface2)', minWidth: 76 }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>{month}</p>
                <p className="text-4xl font-black leading-tight" style={{ color: 'var(--text-1)' }}>{day}</p>
                <div className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(242,196,0,0.15)', color: '#F2C400' }}>
                  J&minus;{daysLeft}
                </div>
              </div>

              <div className="flex-1 p-4 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{comp.title}</p>
                {comp.distanceKm != null && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <IcLocation color="var(--text-2)" />
                    <p className="text-xs" style={{ color: 'var(--text-2)' }}>{comp.distanceKm} km</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <div className="flex -space-x-2">
                    {comp.registrants.slice(0, 4).map((r) => (
                      <div key={r.competitionId} className="rounded-full" style={{ border: '1.5px solid var(--card)' }}>
                        <Avatar initials={initialsOf(r.name)} size={24} yellow={r.profileId === profileId} />
                      </div>
                    ))}
                    {comp.registrants.length > 4 && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ background: 'var(--surface3)', color: 'var(--text-2)', border: '1.5px solid var(--card)' }}>
                        +{comp.registrants.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>
                    {comp.registrants.length} inscrit{comp.registrants.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-3">
                  {mine ? (
                    <button onClick={() => handleUnregister(mine.competitionId)} disabled={busy}
                      className="btn-press inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full disabled:opacity-40"
                      style={{ background: 'rgba(61,158,74,0.12)', color: '#3D9E4A' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Inscrit
                    </button>
                  ) : (
                    <button onClick={() => handleRegister(comp)} disabled={busy}
                      className="btn-press text-[10px] font-bold px-3 py-1.5 rounded-full disabled:opacity-40"
                      style={{ background: '#F2C400', color: '#0E0E0D' }}>
                      S&apos;inscrire
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function ClubScreen() {
  const { profile } = useApp()
  const [tab, setTab] = useState<ClubTab>('feed')

  const { data: clubName } = useQuery<string>(
    () => (profile ? fetchClubName(profile.club_id) : Promise.resolve('')),
    [profile?.club_id],
  )
  const { data: feed } = useQuery<ActivityItem[]>(
    () => (profile ? fetchClubActivityFeed(profile.club_id, 15) : Promise.resolve([])),
    [profile?.club_id],
  )

  const tabs: { id: ClubTab; label: string; icon: (a: boolean) => React.ReactNode }[] = [
    { id: 'feed', label: 'Activité', icon: (a) => <IcFeed active={a} /> },
    { id: 'classements', label: 'Classements', icon: (a) => <IcPodium active={a} /> },
    { id: 'competitions', label: 'Compétitions', icon: (a) => <IcCal active={a} /> },
  ]

  if (!profile) return null

  const content = (
    <div className="screen-enter p-4 md:p-6 max-w-2xl mx-auto">
      <div className="pt-1 mb-4">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Club</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
          {clubName || '—'} · {currentSeasonLabel()}
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: 'var(--card)', boxShadow: 'var(--card-shadow)' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="btn-press flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === t.id ? '#F2C400' : 'transparent',
              color: tab === t.id ? '#0E0E0D' : 'var(--text-2)',
            }}>
            {t.icon(tab === t.id)}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div key={tab} className="screen-enter space-y-3">
        {tab === 'feed' && (
          !feed?.length
            ? <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucune activité pour l&apos;instant.</p></Card>
            : feed.map((item) => <FeedCard key={item.id} item={item} />)
        )}
        {tab === 'classements' && <LeaderboardSection clubId={profile.club_id} />}
        {tab === 'competitions' && <CompetitionsSection clubId={profile.club_id} profileId={profile.id} />}
      </div>
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
