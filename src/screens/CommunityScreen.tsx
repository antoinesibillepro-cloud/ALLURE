import { useState, useEffect, useRef } from 'react'
import { Card, SectionLabel, Avatar } from '../components/ui'

// ── Icons ─────────────────────────────────────────────────────────────────

function IcTrophy({ color = 'currentColor', size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 2H12V8C12 10.2 10.2 12 8 12C5.8 12 4 10.2 4 8V2Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M4 4H2.5C2.5 4 2 6 4 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 4H13.5C13.5 4 14 6 12 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 12V14M6 14H10" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
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
function IcTarget({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.4" />
      <circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1" fill={color} />
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
function IcMoon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 9.5A6 6 0 1 1 6.5 2.5C4 3.5 2.5 6 2.5 8.5A6 6 0 0 0 13.5 9.5Z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function IcHeart({ color = 'currentColor', filled = false }: { color?: string; filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? color : 'none'}>
      <path d="M8 13.5C8 13.5 1.5 9.5 1.5 5.5C1.5 3.5 3 2 5 2C6.2 2 7.2 2.7 8 3.5C8.8 2.7 9.8 2 11 2C13 2 14.5 3.5 14.5 5.5C14.5 9.5 8 13.5 8 13.5Z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
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
function IcUsers({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="5.5" r="2.5" stroke={color} strokeWidth="1.3" />
      <circle cx="11" cy="5.5" r="2" stroke={color} strokeWidth="1.3" />
      <path d="M1 13.5C1 11.5 3.5 10 6.5 10C9.5 10 12 11.5 12 13.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 10.5C13.5 10.5 15 11.5 15 13.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
function IcLock({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="6" width="10" height="7" rx="1.5" stroke={color} strokeWidth="1.3" />
      <path d="M4.5 6V4.5C4.5 3.1 5.6 2 7 2C8.4 2 9.5 3.1 9.5 4.5V6" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
function IcCheck({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6L5 9L10 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Animated progress bar ─────────────────────────────────────────────────

function ProgressBar({ pct, color = '#F2C400', thick = false }: { pct: number; color?: string; thick?: boolean }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 80); return () => clearTimeout(t) }, [pct])
  return (
    <div className={`rounded-full overflow-hidden ${thick ? 'h-3' : 'h-2'}`} style={{ background: 'var(--surface2)' }}>
      <div className="h-full rounded-full"
        style={{ width: `${width}%`, background: color, transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
    </div>
  )
}

// ── Animated counter ──────────────────────────────────────────────────────

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const dur = 1100
    const start = performance.now()
    const raf = (now: number) => {
      const t = Math.min((now - start) / dur, 1)
      const e = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(e * target))
      if (t < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [target])
  return <>{val.toLocaleString('fr-FR')}{suffix}</>
}

// ── Rank badge ────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const map: Record<number, { bg: string; text: string }> = {
    1: { bg: '#F2C400', text: '#0E0E0D' },
    2: { bg: '#B8C0C8', text: '#0E0E0D' },
    3: { bg: '#C48A4F', text: '#fff' },
  }
  const c = map[rank] ?? { bg: 'var(--surface2)', text: 'var(--text-2)' }
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
      style={{ background: c.bg, color: c.text }}>
      {rank}
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────

const KM_BOARD = [
  { initials: 'RS', name: 'Romain Simon', group: 'Élite', value: 74, unit: 'km', isMe: false },
  { initials: 'SB', name: 'Sophie Bernard', group: 'Élite', value: 71, unit: 'km', isMe: false },
  { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 67, unit: 'km', isMe: true },
  { initials: 'JM', name: 'Julien Morel', group: 'Élite', value: 62, unit: 'km', isMe: false },
  { initials: 'NL', name: 'Noé Lambert', group: 'Confirmé', value: 52, unit: 'km', isMe: false },
  { initials: 'CB', name: 'Clara Boyer', group: 'Confirmé', value: 48, unit: 'km', isMe: false },
]

const ASSIDUITE_BOARD = [
  { initials: 'RS', name: 'Romain Simon', group: 'Élite', value: 98, unit: '%', isMe: false },
  { initials: 'SB', name: 'Sophie Bernard', group: 'Élite', value: 95, unit: '%', isMe: false },
  { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 94, unit: '%', isMe: true },
  { initials: 'JM', name: 'Julien Morel', group: 'Élite', value: 91, unit: '%', isMe: false },
  { initials: 'NL', name: 'Noé Lambert', group: 'Confirmé', value: 89, unit: '%', isMe: false },
  { initials: 'CB', name: 'Clara Boyer', group: 'Confirmé', value: 84, unit: '%', isMe: false },
]

const RECUP_BOARD = [
  { initials: 'CB', name: 'Clara Boyer', group: 'Confirmé', value: 8.1, unit: '/10', isMe: false, streak: 18 },
  { initials: 'NL', name: 'Noé Lambert', group: 'Confirmé', value: 7.8, unit: '/10', isMe: false, streak: 14 },
  { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 7.4, unit: '/10', isMe: true, streak: 10 },
  { initials: 'SB', name: 'Sophie Bernard', group: 'Élite', value: 7.1, unit: '/10', isMe: false, streak: 8 },
  { initials: 'JM', name: 'Julien Morel', group: 'Élite', value: 6.8, unit: '/10', isMe: false, streak: 6 },
  { initials: 'RS', name: 'Romain Simon', group: 'Élite', value: 6.2, unit: '/10', isMe: false, streak: 4 },
]

const PAST_CHALLENGES = [
  { name: '500 km en juillet', metric: 'Kilométrage', result: '512 km', target: '500 km', success: true, badge: 'Centurion' },
  { name: 'Défi assiduité juin', metric: 'Assiduité', result: '88%', target: '90%', success: false, badge: null },
]

const FUTURE_CHALLENGES = [
  { name: 'Défi récupération octobre', metric: 'Récupération', start: '1 oct.', end: '31 oct.', description: 'Score moyen ≥ 7/10 sur le mois', groups: 'Club entier' },
  { name: 'Sprint de novembre', metric: 'Assiduité', start: '1 nov.', end: '30 nov.', description: '95% des séances complétées', groups: 'Élite & Confirmé' },
]

const FEED = [
  { initials: 'SB', name: 'Sophie Bernard', text: 'a complété sa séance de fractionné 8×500m', time: 'il y a 2h', type: 'run' },
  { initials: 'CLUB', name: 'Groupe Élite', text: 'a atteint 80% de ses séances cette semaine', time: 'il y a 3h', type: 'team' },
  { initials: 'MR', name: 'Marc Renaud', text: 'a établi un nouveau record personnel sur 10 km — 37\'14"', time: 'il y a 5h', type: 'pr' },
  { initials: 'NL', name: 'Noé Lambert', text: 'a complété sa 3e semaine consécutive sans absence', time: 'hier', type: 'streak' },
  { initials: 'JM', name: 'Julien Morel', text: 'a partagé sa séance longue de 24 km du week-end', time: 'hier', type: 'run' },
]

const FEED_ICON: Record<string, React.ReactNode> = {
  run: <IcRun color="#5EBA65" />,
  team: <IcUsers color="#5B91D8" />,
  pr: <IcTrophy color="#F2C400" size={16} />,
  streak: <IcFlame color="#E4574A" />,
}

const MY_BADGES = [
  { icon: <IcFlame color="#E4574A" />, bg: 'rgba(228,87,74,0.12)', title: 'Régulier', desc: '5 sem. consécutives', earned: true, date: 'Août 2026' },
  { icon: <IcTarget color="#F2C400" />, bg: 'rgba(242,196,0,0.12)', title: 'Centurion', desc: '100 km en un mois', earned: true, date: 'Juil 2026' },
  { icon: <IcHeart color="#E4574A" />, bg: 'rgba(228,87,74,0.12)', title: 'Récupéré', desc: 'Score ≥ 7 pendant 14j', earned: false, date: null },
  { icon: <IcTrophy color="#5B91D8" size={16} />, bg: 'rgba(91,145,216,0.12)', title: 'Défi relevé', desc: 'Défi collectif réussi', earned: false, date: null },
  { icon: <IcStar color="#3D9E4A" />, bg: 'rgba(61,158,74,0.12)', title: '100%', desc: 'Assiduité parfaite 1 mois', earned: false, date: null },
  { icon: <IcMoon color="#5B91D8" />, bg: 'rgba(91,145,216,0.12)', title: 'Sommeil régulier', desc: '10j de bilan sommeil ≥ 8', earned: true, date: 'Juin 2026' },
]

// ── Leaderboard sub-tabs ──────────────────────────────────────────────────

type LBoard = 'km' | 'assiduite' | 'recup'

function LeaderboardSection() {
  const [tab, setTab] = useState<LBoard>('km')

  const boards: Record<LBoard, typeof KM_BOARD | typeof RECUP_BOARD> = {
    km: KM_BOARD,
    assiduite: ASSIDUITE_BOARD,
    recup: RECUP_BOARD,
  }

  const isRecup = tab === 'recup'
  const data = boards[tab]

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface2)' }}>
        {([
          { id: 'km', label: 'Kilométrage' },
          { id: 'assiduite', label: 'Assiduité' },
          { id: 'recup', label: 'Récupération', soft: true },
        ] as { id: LBoard; label: string; soft?: boolean }[]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="btn-press flex-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold py-2 rounded-lg transition-all"
            style={{
              background: tab === t.id ? 'var(--card)' : 'transparent',
              color: tab === t.id ? (t.soft ? '#5B91D8' : 'var(--text-1)') : 'var(--text-2)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.soft && <IcMoon color={tab === t.id ? '#5B91D8' : 'var(--text-2)'} />}
            {t.label}
          </button>
        ))}
      </div>

      {isRecup && (
        <div className="px-3 py-2.5 rounded-2xl flex items-center gap-2"
          style={{ background: 'rgba(91,145,216,0.07)', border: '1px solid rgba(91,145,216,0.12)' }}>
          <IcHeart color="#5B91D8" />
          <p className="text-[10px]" style={{ color: '#5B91D8' }}>
            Basé sur la régularité du score sommeil/forme — la constance prime sur la performance.
          </p>
        </div>
      )}

      <Card className={isRecup ? '!border !border-[rgba(91,145,216,0.12)]' : ''}>
        {data.map((row, i) => (
          <div key={i} className="flex items-center gap-3 py-3"
            style={{
              borderBottom: i < data.length - 1 ? '1px solid var(--border)' : 'none',
              background: row.isMe ? 'rgba(242,196,0,0.05)' : 'transparent',
              margin: row.isMe ? '0 -8px' : '0',
              padding: row.isMe ? '12px 8px' : undefined,
              borderRadius: row.isMe ? 12 : 0,
            }}>
            <RankBadge rank={i + 1} />
            <Avatar initials={row.initials} size={34} yellow={row.isMe} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold" style={{ color: row.isMe ? '#F2C400' : 'var(--text-1)' }}>
                  {row.name}
                </p>
                {row.isMe && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(242,196,0,0.15)', color: '#F2C400' }}>Toi</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>{row.group}</p>
                {isRecup && (row as typeof RECUP_BOARD[0]).streak && (
                  <p className="text-[9px] font-semibold" style={{ color: '#5B91D8' }}>
                    · {(row as typeof RECUP_BOARD[0]).streak}j consécutifs
                  </p>
                )}
              </div>
            </div>
            <p className="text-lg font-black tabular-nums" style={{ color: i === 0 ? (isRecup ? '#5B91D8' : '#F2C400') : 'var(--text-1)' }}>
              {row.value}
              <span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-2)' }}>{row.unit}</span>
            </p>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── Feed item ─────────────────────────────────────────────────────────────

function FeedItem({ item }: { item: typeof FEED[0] }) {
  const [reacted, setReacted] = useState(false)
  const icon = FEED_ICON[item.type] ?? <IcRun color="#5EBA65" />
  return (
    <div className="flex items-start gap-3 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <Avatar initials={item.initials} size={34} />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: 'var(--text-1)' }}>
          <span className="font-bold">{item.name}</span>{' '}
          <span style={{ color: 'var(--text-2)' }}>{item.text}</span>
        </p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-2)' }}>{item.time}</p>
      </div>
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'var(--surface2)' }}>
          {icon}
        </div>
        <button
          onClick={() => setReacted((v) => !v)}
          className="btn-press w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ background: reacted ? 'rgba(242,196,0,0.15)' : 'var(--surface2)' }}
          title="Encourager">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.5 4.5H11.5L8.5 7L9.5 11L6 9L2.5 11L3.5 7L0.5 4.5H4.5L6 1Z"
              stroke={reacted ? '#F2C400' : 'var(--text-2)'}
              fill={reacted ? 'rgba(242,196,0,0.3)' : 'none'}
              strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────

const CHALLENGE_KM = 1847
const CHALLENGE_TARGET = 3000
const PCT = Math.round((CHALLENGE_KM / CHALLENGE_TARGET) * 100)

export default function CommunityScreen() {
  const progressRef = useRef<HTMLDivElement>(null)
  const [progVisible, setProgVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setProgVisible(true) }, { threshold: 0.2 })
    if (progressRef.current) obs.observe(progressRef.current)
    return () => obs.disconnect()
  }, [])

  const challengeCard = (
    <Card topo className="!p-0 overflow-hidden card-lift">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-[#F2C400] flex items-center justify-center">
                <IcTrophy color="#0E0E0D" size={12} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#F2C400' }}>
                Défi en cours
              </span>
            </div>
            <h2 className="text-xl font-black leading-snug" style={{ color: 'var(--text-1)' }}>
              3 000 km cumulés en septembre
            </h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Restants</p>
            <p className="text-3xl font-black leading-tight" style={{ color: 'var(--text-1)' }}>18</p>
            <p className="text-[9px]" style={{ color: 'var(--text-2)' }}>jours</p>
          </div>
        </div>
        <div ref={progressRef} className="mb-3">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-4xl font-black leading-none" style={{ color: 'var(--text-1)' }}>
                <AnimatedNumber target={CHALLENGE_KM} />
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
                sur <span className="font-bold" style={{ color: 'var(--text-1)' }}>
                  {CHALLENGE_TARGET.toLocaleString('fr-FR')} km
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{ color: '#F2C400' }}>{PCT}%</p>
              <p className="text-[9px]" style={{ color: 'var(--text-2)' }}>collectif</p>
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <div className="h-full rounded-full"
              style={{
                width: progVisible ? `${PCT}%` : '0%',
                background: 'linear-gradient(90deg, #F2C400 0%, #FFD84D 100%)',
                transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: 'rgba(242,196,0,0.1)', border: '1px solid rgba(242,196,0,0.18)' }}>
            <IcStar color="#F2C400" />
            <p className="text-xs font-bold" style={{ color: '#F2C400' }}>Tu es 4e sur 28</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>· ta contribution : 42 km</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>28 participants · Club entier</p>
        <button className="btn-press text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: '#F2C400', color: '#0E0E0D' }}>
          Voir le classement
        </button>
      </div>
    </Card>
  )

  const futureChallenges = (
    <div className="space-y-2">
      {FUTURE_CHALLENGES.map((ch, i) => (
        <Card key={i} className="!p-4 card-lift">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{ch.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{ch.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-2)' }}>{ch.start} → {ch.end}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>{ch.groups}</span>
              </div>
            </div>
            <span className="shrink-0 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
              style={{ background: 'rgba(91,145,216,0.12)', color: '#5B91D8' }}>À venir</span>
          </div>
        </Card>
      ))}
    </div>
  )

  const pastChallenges = (
    <div className="space-y-2">
      {PAST_CHALLENGES.map((ch, i) => (
        <Card key={i} className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: ch.success ? 'rgba(61,158,74,0.12)' : 'rgba(228,87,74,0.12)' }}>
              {ch.success ? <IcCheck color="#3D9E4A" /> : <IcLock color="#E4574A" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{ch.name}</p>
              <p className="text-xs mt-0.5" style={{ color: ch.success ? '#3D9E4A' : '#E4574A' }}>
                {ch.result} sur {ch.target}
              </p>
            </div>
            {ch.success && ch.badge && (
              <div className="px-2 py-1 rounded-full text-[9px] font-bold shrink-0"
                style={{ background: 'rgba(242,196,0,0.12)', color: '#F2C400' }}>
                {ch.badge}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )

  const feedSection = (
    <Card className="!px-5 !py-0">
      {FEED.map((item, i) => <FeedItem key={i} item={item} />)}
    </Card>
  )

  const badgesGrid = (
    <div className="grid grid-cols-3 gap-3">
      {MY_BADGES.map((b, i) => (
        <div key={i} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all duration-200"
          style={{
            background: b.earned ? 'var(--card)' : 'var(--surface2)',
            boxShadow: b.earned ? 'var(--card-shadow)' : 'none',
            opacity: b.earned ? 1 : 0.42,
            border: b.earned ? '1px solid var(--border)' : '1px solid transparent',
            transform: b.earned ? 'none' : 'scale(0.97)',
          }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: b.earned ? b.bg : 'var(--surface3)' }}>
            {b.icon}
          </div>
          <div>
            <p className="text-[10px] font-bold leading-tight" style={{ color: b.earned ? 'var(--text-1)' : 'var(--text-2)' }}>
              {b.title}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-2)' }}>{b.desc}</p>
            {b.earned && b.date && (
              <p className="text-[9px] font-semibold mt-1" style={{ color: '#F2C400' }}>{b.date}</p>
            )}
            {!b.earned && (
              <span className="text-[8px] mt-1 flex items-center justify-center gap-0.5" style={{ color: 'var(--text-2)' }}>
                <IcLock color="var(--text-2)" /> Verrouillé
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="screen-enter">

      {/* ── Mobile: single column ── */}
      <div className="md:hidden p-4 space-y-5">
        <div className="pt-1">
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Communauté</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Club ACLR · Paris Athlétisme</p>
        </div>
        {challengeCard}
        <div><SectionLabel>Classements — Septembre</SectionLabel><LeaderboardSection /></div>
        <div><SectionLabel>Défis à venir</SectionLabel>{futureChallenges}</div>
        <div><SectionLabel>Défis passés</SectionLabel>{pastChallenges}</div>
        <div><SectionLabel>Fil du club</SectionLabel>{feedSection}</div>
        <div><SectionLabel>Mes badges</SectionLabel>{badgesGrid}</div>
      </div>

      {/* ── Desktop: 2-column grid ── */}
      <div className="hidden md:grid md:grid-cols-[1fr_380px] md:gap-6 p-6 pt-4 items-start">

        {/* Left column */}
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-black" style={{ color: 'var(--text-1)' }}>Communauté</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Club ACLR · Paris Athlétisme</p>
          </div>
          {challengeCard}
          <div>
            <SectionLabel>Défis à venir</SectionLabel>
            {futureChallenges}
          </div>
          <div>
            <SectionLabel>Défis passés</SectionLabel>
            {pastChallenges}
          </div>
          <div>
            <SectionLabel>Fil du club</SectionLabel>
            {feedSection}
          </div>
        </div>

        {/* Right column — sticky panel */}
        <div className="space-y-5 md:sticky md:top-20">
          <div>
            <SectionLabel>Classements — Septembre</SectionLabel>
            <LeaderboardSection />
          </div>
          <div>
            <SectionLabel>Mes badges</SectionLabel>
            {badgesGrid}
          </div>
        </div>
      </div>
    </div>
  )
}
