import { useState } from 'react'
import { Card, SectionLabel, Avatar } from '../../components/ui'

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
function IcMoon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 9.5A6 6 0 1 1 6.5 2.5C4 3.5 2.5 6 2.5 8.5A6 6 0 0 0 13.5 9.5Z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
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
function IcStar({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L9.5 6H14L10.5 8.5L12 12.5L8 10L4 12.5L5.5 8.5L2 6H6.5L8 2Z"
        stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
function IcPlus({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5V12.5M1.5 7H12.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
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
function IcAlert({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14.5 13H1.5L8 2Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 7V9.5M8 11V11.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IcMegaphone({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12 3L4 6.5H2.5C1.7 6.5 1 7.2 1 8C1 8.8 1.7 9.5 2.5 9.5H4L12 13V3Z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M4 9.5L5 13" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13.5 5.5C14.5 6 15 6.9 15 8C15 9.1 14.5 10 13.5 10.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// ── Rank badge ─────────────────────────────────────────────────────────────

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

// ── Progress bar ───────────────────────────────────────────────────────────

function ProgressBar({ pct, color = '#F2C400' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────

const CHALLENGES = [
  {
    name: '3 000 km cumulés en septembre',
    metric: 'Kilométrage',
    status: 'active' as const,
    current: 1847,
    target: 3000,
    end: '30 sept.',
    participants: 28,
    pct: 62,
  },
  {
    name: 'Défi récupération octobre',
    metric: 'Récupération',
    status: 'planned' as const,
    current: 0,
    target: 7,
    end: '31 oct.',
    participants: 0,
    pct: 0,
  },
  {
    name: '500 km en juillet',
    metric: 'Kilométrage',
    status: 'done' as const,
    current: 512,
    target: 500,
    end: '31 juil.',
    participants: 24,
    pct: 100,
  },
  {
    name: 'Défi assiduité juin',
    metric: 'Assiduité',
    status: 'done' as const,
    current: 88,
    target: 90,
    end: '30 juin',
    participants: 22,
    pct: 97,
  },
]

const KM_BOARD = [
  { initials: 'RS', name: 'Romain Simon', group: 'Élite', value: 74, unit: 'km' },
  { initials: 'SB', name: 'Sophie Bernard', group: 'Élite', value: 71, unit: 'km' },
  { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 67, unit: 'km' },
  { initials: 'JM', name: 'Julien Morel', group: 'Élite', value: 62, unit: 'km' },
  { initials: 'NL', name: 'Noé Lambert', group: 'Confirmé', value: 52, unit: 'km' },
  { initials: 'CB', name: 'Clara Boyer', group: 'Confirmé', value: 48, unit: 'km' },
  { initials: 'AM', name: 'Alex Martin', group: 'Confirmé', value: 41, unit: 'km' },
  { initials: 'LR', name: 'Lucas Renard', group: 'Élite', value: 38, unit: 'km' },
]

const ASSIDUITE_BOARD = [
  { initials: 'RS', name: 'Romain Simon', group: 'Élite', value: 98, unit: '%' },
  { initials: 'SB', name: 'Sophie Bernard', group: 'Élite', value: 95, unit: '%' },
  { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 94, unit: '%' },
  { initials: 'JM', name: 'Julien Morel', group: 'Élite', value: 91, unit: '%' },
  { initials: 'NL', name: 'Noé Lambert', group: 'Confirmé', value: 89, unit: '%' },
  { initials: 'CB', name: 'Clara Boyer', group: 'Confirmé', value: 84, unit: '%' },
  { initials: 'AM', name: 'Alex Martin', group: 'Confirmé', value: 78, unit: '%' },
  { initials: 'LR', name: 'Lucas Renard', group: 'Élite', value: 70, unit: '%' },
]

const RECUP_BOARD = [
  { initials: 'CB', name: 'Clara Boyer', group: 'Confirmé', value: 8.1, unit: '/10', streak: 18, alert: false },
  { initials: 'NL', name: 'Noé Lambert', group: 'Confirmé', value: 7.8, unit: '/10', streak: 14, alert: false },
  { initials: 'TD', name: 'Thomas Dupont', group: 'Élite', value: 7.4, unit: '/10', streak: 10, alert: false },
  { initials: 'SB', name: 'Sophie Bernard', group: 'Élite', value: 7.1, unit: '/10', streak: 8, alert: false },
  { initials: 'JM', name: 'Julien Morel', group: 'Élite', value: 6.8, unit: '/10', streak: 6, alert: false },
  { initials: 'RS', name: 'Romain Simon', group: 'Élite', value: 6.2, unit: '/10', streak: 4, alert: false },
  { initials: 'AM', name: 'Alex Martin', group: 'Confirmé', value: 5.4, unit: '/10', streak: 1, alert: true },
  { initials: 'LR', name: 'Lucas Renard', group: 'Élite', value: 4.9, unit: '/10', streak: 0, alert: true },
]

const FEED = [
  { initials: 'SB', name: 'Sophie Bernard', text: 'a complété sa séance de fractionné 8×500m', time: 'il y a 2h', type: 'run' },
  { initials: 'CLUB', name: 'Groupe Élite', text: 'a atteint 80% de ses séances cette semaine', time: 'il y a 3h', type: 'team' },
  { initials: 'MR', name: 'Marc Renaud', text: 'Nouveau record personnel sur 10 km — 37\'14"', time: 'il y a 5h', type: 'pr' },
  { initials: 'NL', name: 'Noé Lambert', text: 'a complété sa 3e semaine consécutive sans absence', time: 'hier', type: 'streak' },
]

const FEED_ICON: Record<string, React.ReactNode> = {
  run: <IcRun color="#5EBA65" />,
  team: <IcUsers color="#5B91D8" />,
  pr: <IcTrophy color="#F2C400" size={16} />,
  streak: <IcFlame color="#E4574A" />,
  coach: <IcMegaphone color="#F2C400" />,
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'active' | 'planned' | 'done' }) {
  const s = {
    active: { label: 'En cours', bg: 'rgba(61,158,74,0.12)', color: '#3D9E4A' },
    planned: { label: 'Planifié', bg: 'rgba(91,145,216,0.12)', color: '#5B91D8' },
    done: { label: 'Terminé', bg: 'var(--surface2)', color: 'var(--text-2)' },
  }[status]
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ── Create challenge form ─────────────────────────────────────────────────

function CreateChallengeModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    metric: 'kilometrage',
    target: '',
    start: '',
    end: '',
    groups: 'club',
  })

  const METRICS = [
    { id: 'kilometrage', label: 'Kilométrage', unit: 'km' },
    { id: 'assiduite', label: 'Assiduité', unit: '%' },
    { id: 'recup', label: 'Récupération', unit: '/10' },
    { id: 'seances', label: 'Séances complétées', unit: 'séances' },
  ]
  const GROUPS = [
    { id: 'club', label: 'Club entier' },
    { id: 'elite', label: 'Élite' },
    { id: 'confirme', label: 'Confirmé' },
    { id: 'debutant', label: 'Débutant' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-4 md:pb-0"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-3xl p-6 space-y-5"
        style={{ background: 'var(--card)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black" style={{ color: 'var(--text-1)' }}>Créer un défi</h2>
          <button onClick={onClose} className="btn-press w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>
              Nom du défi
            </label>
            <input
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
              placeholder="Ex: 500 km en octobre"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>
              Métrique
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {METRICS.map((m) => (
                <button key={m.id} onClick={() => setForm((p) => ({ ...p, metric: m.id }))}
                  className="btn-press px-3 py-2 rounded-xl text-xs font-semibold text-left"
                  style={{
                    background: form.metric === m.id ? 'rgba(242,196,0,0.1)' : 'var(--surface2)',
                    color: form.metric === m.id ? '#F2C400' : 'var(--text-2)',
                    border: form.metric === m.id ? '1px solid rgba(242,196,0,0.25)' : '1px solid transparent',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Objectif
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                placeholder="500"
                type="number"
                value={form.target}
                onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Début
              </label>
              <input
                type="date"
                className="w-full px-3 py-2.5 rounded-xl text-xs outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                value={form.start}
                onChange={(e) => setForm((p) => ({ ...p, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Fin
              </label>
              <input
                type="date"
                className="w-full px-3 py-2.5 rounded-xl text-xs outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                value={form.end}
                onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>
              Participants
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {GROUPS.map((g) => (
                <button key={g.id} onClick={() => setForm((p) => ({ ...p, groups: g.id }))}
                  className="btn-press px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: form.groups === g.id ? '#F2C400' : 'var(--surface2)',
                    color: form.groups === g.id ? '#0E0E0D' : 'var(--text-2)',
                  }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="btn-press flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
            Annuler
          </button>
          <button onClick={onClose}
            className="btn-press flex-1 py-3 rounded-2xl text-sm font-black bg-[#F2C400] text-[#0E0E0D]">
            Lancer le défi
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────

type CoachTab = 'defis' | 'fil' | 'classements'

export default function CoachCommunity() {
  const [tab, setTab] = useState<CoachTab>('defis')
  const [showCreate, setShowCreate] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [lboard, setLboard] = useState<'km' | 'assiduite' | 'recup'>('km')

  const tabs: { id: CoachTab; label: string }[] = [
    { id: 'defis', label: 'Gestion des défis' },
    { id: 'fil', label: 'Fil du club' },
    { id: 'classements', label: 'Classements' },
  ]

  const boards = { km: KM_BOARD, assiduite: ASSIDUITE_BOARD, recup: RECUP_BOARD }
  const currentBoard = boards[lboard]
  const isRecup = lboard === 'recup'

  const tabBar = (hideOnDesktop = false) => (
    <div className={`flex gap-1 p-1 rounded-2xl ${hideOnDesktop ? 'md:hidden' : ''}`}
      style={{ background: 'var(--card)', boxShadow: 'var(--card-shadow)' }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setTab(t.id)}
          className="btn-press flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{
            background: tab === t.id ? '#F2C400' : 'transparent',
            color: tab === t.id ? '#0E0E0D' : 'var(--text-2)',
          }}>
          {t.label}
        </button>
      ))}
    </div>
  )

  const defisPanel = (
    <div key="defis" className="screen-enter space-y-3">
      {CHALLENGES.map((ch, i) => (
        <Card key={i} className="!p-0 overflow-hidden card-lift">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{ch.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {ch.metric} · Fin le {ch.end}
                </p>
              </div>
              <StatusBadge status={ch.status} />
            </div>

            {ch.status !== 'planned' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-2)' }}>Progression collective</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>
                    {ch.current.toLocaleString('fr-FR')} / {ch.target.toLocaleString('fr-FR')}
                    {ch.metric === 'Kilométrage' ? ' km' : ch.metric === 'Assiduité' ? '%' : ''}
                  </span>
                </div>
                <ProgressBar pct={ch.pct}
                  color={ch.status === 'done' ? (ch.pct >= 100 ? '#3D9E4A' : 'var(--text-2)') : '#F2C400'} />
              </div>
            )}

            {ch.status === 'planned' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(91,145,216,0.07)' }}>
                <IcAlert color="#5B91D8" />
                <p className="text-xs" style={{ color: '#5B91D8' }}>
                  Ce défi n&apos;a pas encore commencé.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div className="flex items-center gap-1.5">
              <IcUsers color="var(--text-2)" />
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                {ch.participants > 0 ? `${ch.participants} participants` : 'Pas encore de participants'}
              </span>
            </div>
            {ch.status === 'active' && (
              <button className="btn-press text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(242,196,0,0.12)', color: '#F2C400' }}>
                Détail
              </button>
            )}
            {ch.status === 'done' && ch.pct >= 100 && (
              <div className="flex items-center gap-1" style={{ color: '#3D9E4A' }}>
                <IcCheck color="#3D9E4A" />
                <span className="text-[10px] font-bold">Objectif atteint</span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )

  const filPanel = (
    <div key="fil" className="screen-enter space-y-3">
      <Card className="!p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#F2C400] flex items-center justify-center shrink-0">
            <IcMegaphone color="#0E0E0D" />
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
            Publier une annonce ou félicitation
          </p>
        </div>
        <textarea
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
          placeholder="Bravo à tout le groupe pour la semaine !"
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
        />
        <button className="btn-press mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-[#F2C400] text-[#0E0E0D]">
          Publier en tant que coach
        </button>
      </Card>

      <div className="px-4 py-4 rounded-3xl"
        style={{ background: 'rgba(242,196,0,0.07)', border: '1px solid rgba(242,196,0,0.18)' }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F2C400] flex items-center justify-center text-[10px] font-black shrink-0 text-[#0E0E0D]">
            ML
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Marc Leroy</p>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(242,196,0,0.15)' }}>
                <IcMegaphone color="#F2C400" />
                <span className="text-[8px] font-bold" style={{ color: '#F2C400' }}>COACH</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-1)' }}>
              Bravo à tout le groupe pour la semaine ! Les chiffres d&apos;assiduité sont excellents.
              Continuez comme ça avant les régionaux.
            </p>
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-2)' }}>il y a 1h</p>
          </div>
        </div>
      </div>

      <Card className="!px-5 !py-0">
        {FEED.map((item, i) => {
          const icon = FEED_ICON[item.type] ?? <IcRun color="#5EBA65" />
          return (
            <div key={i} className="flex items-start gap-3 py-3.5"
              style={{ borderBottom: i < FEED.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <Avatar initials={item.initials} size={34} />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug" style={{ color: 'var(--text-1)' }}>
                  <span className="font-bold">{item.name}</span>{' '}
                  <span style={{ color: 'var(--text-2)' }}>{item.text}</span>
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-2)' }}>{item.time}</p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--surface2)' }}>
                {icon}
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )

  const classmentsPanel = (
    <div key="classements" className="screen-enter space-y-3">
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface2)' }}>
        {([
          { id: 'km', label: 'Kilométrage' },
          { id: 'assiduite', label: 'Assiduité' },
          { id: 'recup', label: 'Récupération' },
        ] as { id: typeof lboard; label: string }[]).map((t) => (
          <button key={t.id} onClick={() => setLboard(t.id)}
            className="btn-press flex-1 text-[10px] font-semibold py-2 rounded-lg transition-all"
            style={{
              background: lboard === t.id ? 'var(--card)' : 'transparent',
              color: lboard === t.id ? (t.id === 'recup' ? '#5B91D8' : 'var(--text-1)') : 'var(--text-2)',
              boxShadow: lboard === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {isRecup && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-2xl"
          style={{ background: 'rgba(91,145,216,0.07)', border: '1px solid rgba(91,145,216,0.12)' }}>
          <IcMoon color="#5B91D8" />
          <p className="text-[10px]" style={{ color: '#5B91D8' }}>
            Les athlètes signalés ⚠ ont un score de récupération insuffisant — envisagez d&apos;alléger leur charge.
          </p>
        </div>
      )}

      <Card>
        {currentBoard.map((row, i) => (
          <div key={i} className="flex items-center gap-3 py-3"
            style={{ borderBottom: i < currentBoard.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <RankBadge rank={i + 1} />
            <Avatar initials={row.initials} size={34} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{row.name}</p>
                {isRecup && (row as typeof RECUP_BOARD[0]).alert && (
                  <IcAlert color="#E4574A" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>{row.group}</p>
                {isRecup && (
                  <p className="text-[9px] font-semibold" style={{ color: (row as typeof RECUP_BOARD[0]).streak > 0 ? '#5B91D8' : '#E4574A' }}>
                    · {(row as typeof RECUP_BOARD[0]).streak}j consécutifs
                  </p>
                )}
              </div>
            </div>
            <p className="text-lg font-black tabular-nums"
              style={{ color: i === 0 ? (isRecup ? '#5B91D8' : '#F2C400') : 'var(--text-1)' }}>
              {row.value}
              <span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-2)' }}>{row.unit}</span>
            </p>
          </div>
        ))}
      </Card>
    </div>
  )

  return (
    <div className="screen-enter">
      {showCreate && <CreateChallengeModal onClose={() => setShowCreate(false)} />}

      {/* ── Mobile layout ── */}
      <div className="md:hidden p-4 space-y-5">
        <div className="flex items-start justify-between pt-1">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Communauté</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Vue coach · Club ACLR</p>
          </div>
          {tab === 'defis' && (
            <button onClick={() => setShowCreate(true)}
              className="btn-press flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold bg-[#F2C400] text-[#0E0E0D]">
              <IcPlus color="#0E0E0D" />
              Créer
            </button>
          )}
        </div>
        {tabBar()}
        {tab === 'defis' && defisPanel}
        {tab === 'fil' && filPanel}
        {tab === 'classements' && classmentsPanel}
      </div>

      {/* ── Desktop layout: 2-column ── */}
      <div className="hidden md:grid md:grid-cols-[1fr_400px] md:gap-6 p-6 pt-4 items-start">

        {/* Left: header + main content (défis or fil) */}
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black" style={{ color: 'var(--text-1)' }}>Communauté</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Vue coach · Club ACLR</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="btn-press flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold bg-[#F2C400] text-[#0E0E0D]">
              <IcPlus color="#0E0E0D" />
              Créer un défi
            </button>
          </div>

          {/* Défis always visible on desktop left */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-2)' }}>Défis actifs &amp; planifiés</p>
            {defisPanel}
          </div>

          {/* Fil du club below */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-2)' }}>Fil du club</p>
            {filPanel}
          </div>
        </div>

        {/* Right: classements — sticky */}
        <div className="space-y-5 md:sticky md:top-20">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Classements</p>
          {classmentsPanel}
        </div>
      </div>
    </div>
  )
}
