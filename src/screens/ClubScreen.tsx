import { useState } from 'react'
import { Card, SectionLabel, Avatar } from '../components/ui'

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
function IcMedal({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="10" r="4" stroke={color} strokeWidth="1.4" />
      <path d="M5.5 2H10.5L9 6H7L5.5 2Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
function IcFlame({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2C8 2 11 5 11 8.5C11 10.4 9.7 12 8 12C6.3 12 5 10.4 5 8.5C5 7 6 6 6 6C6 6 6.5 8 8 8C8 8 7 6.5 8 2Z"
        stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IcStar({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L9.5 6H14L10.5 8.5L12 12.5L8 10L4 12.5L5.5 8.5L2 6H6.5L8 2Z"
        stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
function IcMountain({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 13L6 5L9 9L11 7L14.5 13H1.5Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function IcTarget({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.4" />
      <circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1" fill={color} />
    </svg>
  )
}
function IcSunrise({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 10H13" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 8C9.1 8 10 7.1 10 6C10 4.9 9.1 4 8 4C6.9 4 6 4.9 6 6" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 1.5V2.5M11.5 3.5L10.8 4.2M14 7H13M3 7H2M4.5 3.5L5.2 4.2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2 13H14" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IcHeart({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill={filled ? '#F2C400' : 'none'}>
      <path d="M7.5 12.5C7.5 12.5 1.5 9 1.5 5.5C1.5 3.5 3 2 5 2C6.1 2 7.1 2.6 7.5 3.3C7.9 2.6 8.9 2 10 2C12 2 13.5 3.5 13.5 5.5C13.5 9 7.5 12.5 7.5 12.5Z"
        stroke="#F2C400" strokeWidth="1.3" strokeLinejoin="round" />
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
function IcCalendarSmall({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="9.5" rx="1.5" stroke={color} strokeWidth="1.3" />
      <path d="M4.5 1.5V4M9.5 1.5V4M1.5 6.5H12.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
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

// ── Rank badge ────────────────────────────────────────────────────────────

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

// ── Data ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  run: { icon: <IcRun color="#5EBA65" />, color: '#5EBA65' },
  pr: { icon: <IcTrophy color="#F2C400" />, color: '#F2C400' },
  badge: { icon: <IcMedal color="#5B91D8" />, color: '#5B91D8' },
}

const FEED_ITEMS = [
  { who: 'RS', name: 'Romain Simon', group: 'Élite', time: 'il y a 23 min', type: 'run', detail: 'Fractionné 10×400m', km: 12.4, duration: '55 min', pr: null as null | { dist: string; time: string }, likes: 8, liked: false },
  { who: 'SB', name: 'Sophie Bernard', group: 'Élite', time: 'il y a 1h', type: 'pr', detail: 'Nouveau record personnel', km: null as null | number, duration: null as null | string, pr: { dist: '1500m', time: "4'08\"" }, likes: 14, liked: true },
  { who: 'NL', name: 'Noé Lambert', group: 'Confirmé', time: 'il y a 2h', type: 'run', detail: 'Endurance fondamentale', km: 18.2, duration: '1h 32', pr: null, likes: 5, liked: false },
  { who: 'CB', name: 'Clara Boyer', group: 'Confirmé', time: 'il y a 3h', type: 'badge', detail: 'Centurion — 100 km ce mois', km: null, duration: null, pr: null, likes: 11, liked: false },
  { who: 'TD', name: 'Thomas Dupont', group: 'Élite', time: 'hier', type: 'badge', detail: '5 semaines consécutives sans absence', km: null, duration: null, pr: null, likes: 19, liked: false },
]

const LEADERBOARDS = {
  assiduite: [
    { initials: 'RS', name: 'Romain Simon', group: 'Élite', value: 98, unit: '%' },
    { initials: 'SB', name: 'Sophie Bernard', group: 'Élite', value: 95, unit: '%' },
    { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 94, unit: '%' },
    { initials: 'JM', name: 'Julien Morel', group: 'Élite', value: 91, unit: '%' },
    { initials: 'NL', name: 'Noé Lambert', group: 'Confirmé', value: 89, unit: '%' },
  ],
  kilometrage: [
    { initials: 'RS', name: 'Romain Simon', group: 'Élite', value: 74, unit: 'km' },
    { initials: 'SB', name: 'Sophie Bernard', group: 'Élite', value: 71, unit: 'km' },
    { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 67, unit: 'km' },
    { initials: 'JM', name: 'Julien Morel', group: 'Élite', value: 62, unit: 'km' },
    { initials: 'NL', name: 'Noé Lambert', group: 'Confirmé', value: 52, unit: 'km' },
  ],
  progressionVMA: [
    { initials: 'CB', name: 'Clara Boyer', group: 'Confirmé', value: 0.8, unit: 'km/h' },
    { initials: 'PD', name: 'Paul Durand', group: 'Débutant', value: 0.7, unit: 'km/h' },
    { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 0.4, unit: 'km/h' },
    { initials: 'AM', name: 'Alex Martin', group: 'Confirmé', value: 0.3, unit: 'km/h' },
    { initials: 'LR', name: 'Lucas Renard', group: 'Élite', value: 0.2, unit: 'km/h' },
  ],
}

type LeaderKey = keyof typeof LEADERBOARDS
const LEADERBOARD_LABELS: Record<LeaderKey, string> = {
  assiduite: 'Assiduité',
  kilometrage: 'Kilométrage',
  progressionVMA: 'VMA',
}

const BADGES = [
  { icon: <IcFlame color="#E4574A" />, title: 'Sur la lancée', desc: '5 sem. consécutives', bg: 'rgba(228,87,74,0.1)', earned: true, date: 'Août 2026' },
  { icon: <IcTarget color="#F2C400" />, title: 'Centurion', desc: '100 km en un mois', bg: 'rgba(242,196,0,0.1)', earned: true, date: 'Juil 2026' },
  { icon: <IcTrophy color="#5B91D8" />, title: 'PR Machine', desc: '3 PR en une saison', bg: 'rgba(91,145,216,0.1)', earned: false, date: null },
  { icon: <IcMountain color="#9C7A3C" />, title: 'Endurant', desc: '1 000 km cumulés', bg: 'rgba(156,122,60,0.1)', earned: false, date: null },
  { icon: <IcStar color="#3D9E4A" />, title: '100%', desc: 'Assiduité parfaite', bg: 'rgba(61,158,74,0.1)', earned: false, date: null },
  { icon: <IcSunrise color="#5B91D8" />, title: 'Lève-tôt', desc: '10 séances matinales', bg: 'rgba(91,145,216,0.1)', earned: true, date: 'Juin 2026' },
]

const COMPETITIONS = [
  { date: '28', month: 'août', name: 'Championnats régionaux', location: 'Versailles', events: ['1500m', '5000m'], registered: ['TD', 'SB', 'RS'], open: true, daysLeft: 18 },
  { date: '14', month: 'sept.', name: 'Meeting de Paris', location: 'Stade Charléty', events: ['800m', '1500m', '3000m'], registered: ['TD', 'LR', 'JM', 'CF'], open: true, daysLeft: 35 },
  { date: '5', month: 'oct.', name: 'Cross de Meudon', location: 'Forêt de Meudon', events: ['Cross 8km', 'Cross 4km'], registered: ['RS', 'SB', 'NL', 'CB', 'AM'], open: false, daysLeft: 56 },
  { date: '19', month: 'oct.', name: 'Championnat cross clubs', location: 'Vincennes', events: ['Cross équipe'], registered: ['TD', 'SB', 'RS', 'JM', 'LR', 'CF'], open: false, daysLeft: 70 },
]

// ── Feed card ─────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: typeof FEED_ITEMS[0] }) {
  const [liked, setLiked] = useState(item.liked)
  const [likes, setLikes] = useState(item.likes)
  const tc = TYPE_META[item.type]

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Avatar initials={item.who} size={38} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{item.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>{item.group}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{item.time}</p>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${tc.color}18` }}>
            {tc.icon}
          </div>
        </div>

        <div className="mt-3">
          {item.type === 'pr' && item.pr && (
            <div className="p-3 rounded-2xl flex items-center gap-3 mb-2"
              style={{ background: 'rgba(242,196,0,0.07)', border: '1px solid rgba(242,196,0,0.15)' }}>
              <div className="w-10 h-10 rounded-xl bg-[#F2C400] flex items-center justify-center shrink-0">
                <IcTrophy color="#0E0E0D" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Record personnel · {item.pr.dist}</p>
                <p className="text-2xl font-black" style={{ color: '#F2C400' }}>{item.pr.time}</p>
              </div>
            </div>
          )}

          {item.type === 'badge' && (
            <div className="p-3 rounded-2xl flex items-center gap-3 mb-2"
              style={{ background: 'var(--surface2)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(91,145,216,0.15)' }}>
                <IcMedal color="#5B91D8" />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{item.detail}</p>
            </div>
          )}

          {item.type === 'run' && (
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-1)' }}>{item.detail}</p>
          )}

          {item.km && item.duration && (
            <div className="flex gap-4 mt-1">
              <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{item.km} km</span>
              <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{item.duration}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => { setLiked((v) => !v); setLikes((v) => v + (liked ? -1 : 1)) }}
          className="btn-press flex items-center gap-1.5"
          style={{ color: liked ? '#F2C400' : 'var(--text-2)' }}>
          <IcHeart filled={liked} />
          <span className="text-xs font-semibold tabular-nums">{likes}</span>
        </button>
        <button className="btn-press text-xs" style={{ color: 'var(--text-2)' }}>Commenter</button>
        <button className="btn-press text-xs" style={{ color: 'var(--text-2)' }}>Féliciter</button>
      </div>
    </Card>
  )
}

// ── Leaderboard section ───────────────────────────────────────────────────

function LeaderboardSection() {
  const [activeLeader, setActiveLeader] = useState<LeaderKey>('assiduite')
  const data = LEADERBOARDS[activeLeader]

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
        {data.map((row, i) => (
          <div key={i} className="flex items-center gap-3 py-3"
            style={{ borderBottom: i < data.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <RankBadge rank={i + 1} />
            <Avatar initials={row.initials} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{row.name}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>{row.group}</p>
            </div>
            <p className="text-lg font-black tabular-nums" style={{ color: i === 0 ? '#F2C400' : 'var(--text-1)' }}>
              {activeLeader === 'progressionVMA' ? `+${row.value}` : row.value}
              <span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-2)' }}>{row.unit}</span>
            </p>
          </div>
        ))}
      </Card>

      <SectionLabel>Badges & récompenses</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        {BADGES.map((badge, i) => (
          <div key={i} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
            style={{
              background: badge.earned ? 'var(--card)' : 'var(--surface2)',
              boxShadow: badge.earned ? 'var(--card-shadow)' : 'none',
              opacity: badge.earned ? 1 : 0.45,
              border: badge.earned ? '1px solid var(--border)' : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: badge.earned ? badge.bg : 'var(--surface2)' }}>
              {badge.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold leading-tight" style={{ color: badge.earned ? 'var(--text-1)' : 'var(--text-2)' }}>
                {badge.title}
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-2)' }}>{badge.desc}</p>
              {badge.earned && badge.date && (
                <p className="text-[9px] font-semibold mt-1" style={{ color: '#F2C400' }}>{badge.date}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Competitions section ───────────────────────────────────────────────────

function CompetitionsSection() {
  const myInitials = 'TD'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Calendrier du club</SectionLabel>
        <button className="btn-press text-xs font-semibold px-3 py-1.5 rounded-xl"
          style={{ background: '#F2C400', color: '#0E0E0D' }}>+ Ajouter</button>
      </div>

      {COMPETITIONS.map((comp, i) => {
        const isRegistered = comp.registered.includes(myInitials)
        return (
          <Card key={i} className="!p-0 overflow-hidden card-lift">
            <div className="flex">
              <div className="flex flex-col items-center justify-center px-5 py-5 shrink-0"
                style={{ background: 'var(--surface2)', minWidth: 76 }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
                  {comp.month}
                </p>
                <p className="text-4xl font-black leading-tight" style={{ color: 'var(--text-1)' }}>
                  {comp.date}
                </p>
                <div className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(242,196,0,0.15)', color: '#F2C400' }}>
                  J&minus;{comp.daysLeft}
                </div>
              </div>

              <div className="flex-1 p-4 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{comp.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <IcLocation color="var(--text-2)" />
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>{comp.location}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {comp.events.map((ev) => (
                    <span key={ev} className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                      {ev}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="flex -space-x-2">
                    {comp.registered.slice(0, 4).map((init) => (
                      <div key={init} className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{
                          background: init === myInitials ? '#F2C400' : 'var(--avatar)',
                          color: init === myInitials ? '#0E0E0D' : 'var(--avatar-text)',
                          border: '1.5px solid var(--card)',
                        }}>
                        {init}
                      </div>
                    ))}
                    {comp.registered.length > 4 && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ background: 'var(--surface3)', color: 'var(--text-2)', border: '1.5px solid var(--card)' }}>
                        +{comp.registered.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>
                    {comp.registered.length} inscrit{comp.registered.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-3">
                  {isRegistered ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(61,158,74,0.12)', color: '#3D9E4A' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Inscrit
                    </span>
                  ) : comp.open ? (
                    <button className="btn-press text-[10px] font-bold px-3 py-1.5 rounded-full"
                      style={{ background: '#F2C400', color: '#0E0E0D' }}>
                      S&apos;inscrire
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <IcCalendarSmall color="var(--text-2)" />
                      <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>Inscriptions à venir</span>
                    </div>
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
  const [tab, setTab] = useState<ClubTab>('feed')

  const tabs: { id: ClubTab; label: string; icon: (a: boolean) => React.ReactNode }[] = [
    { id: 'feed', label: 'Activité', icon: (a) => <IcFeed active={a} /> },
    { id: 'classements', label: 'Classements', icon: (a) => <IcPodium active={a} /> },
    { id: 'competitions', label: 'Compétitions', icon: (a) => <IcCal active={a} /> },
  ]

  return (
    <div className="screen-enter p-4 md:p-6 max-w-2xl mx-auto">
      <div className="pt-1 mb-4">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Club</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Paris Athlétisme · Saison 2025–26</p>
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
        {tab === 'feed' && FEED_ITEMS.map((item, i) => <FeedCard key={i} item={item} />)}
        {tab === 'classements' && <LeaderboardSection />}
        {tab === 'competitions' && <CompetitionsSection />}
      </div>
    </div>
  )
}
