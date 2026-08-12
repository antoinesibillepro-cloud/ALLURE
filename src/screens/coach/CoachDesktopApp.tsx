import { useApp } from '../../context/AppContext'
import CoachDashboard from './CoachDashboard'
import CoachGroups from './CoachGroups'
import CoachSessions from './CoachSessions'
import CoachStats from './CoachStats'
import CoachMessaging from './CoachMessaging'
import CoachCommunity from './CoachCommunity'
import CoachAdmin from './CoachAdmin'
import CoachRaces from './CoachRaces'

interface Props {
  cScreen: string
  setCScreen: (s: string) => void
}

function IcDashboard({ c }: { c: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5" />
    </svg>
  )
}
function IcGroups({ c }: { c: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="7" r="3" stroke={c} strokeWidth="1.5" />
      <circle cx="14" cy="7" r="3" stroke={c} strokeWidth="1.5" />
      <path d="M1 17C1 14.5 3.5 12.5 7 12.5C10.5 12.5 13 14.5 13 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 12.5C17.5 12.5 19 14.5 19 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IcSessions({ c }: { c: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="14" rx="2" stroke={c} strokeWidth="1.5" />
      <path d="M6 2V6M14 2V6M2 9H18" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 13H10M6 16H14" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
function IcCommunity({ c }: { c: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="6" r="3" stroke={c} strokeWidth="1.5" />
      <circle cx="14.5" cy="6.5" r="2.5" stroke={c} strokeWidth="1.5" />
      <path d="M1 17C1 14.2 3.7 12 7 12C10.3 12 13 14.2 13 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13.5 12.5C16.5 12.5 19 14.2 19 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IcMessage({ c }: { c: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M17 3H3C2.4 3 2 3.4 2 4V13C2 13.6 2.4 14 3 14H8L10 17.5L12 14H17C17.6 14 18 13.6 18 13V4C18 3.4 17.6 3 17 3Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
function IcStats({ c }: { c: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="12" width="3.5" height="6" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="8.25" y="7" width="3.5" height="11" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="14.5" y="2" width="3.5" height="16" rx="1" stroke={c} strokeWidth="1.5" />
    </svg>
  )
}
function IcSettings({ c }: { c: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.8" stroke={c} strokeWidth="1.5" />
      <path d="M10 2.5V4.5M10 15.5V17.5M17.5 10H15.5M4.5 10H2.5M15.1 4.9L13.7 6.3M6.3 13.7L4.9 15.1M15.1 15.1L13.7 13.7M6.3 6.3L4.9 4.9"
        stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IcRaces({ c }: { c: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: IcDashboard },
  { key: 'groups', label: 'Groupes', icon: IcGroups },
  { key: 'sessions', label: 'Séances', icon: IcSessions },
  { key: 'community', label: 'Communauté', icon: IcCommunity },
  { key: 'messaging', label: 'Messages', icon: IcMessage },
  { key: 'clubstats', label: 'Stats club', icon: IcStats },
  { key: 'races', label: 'Courses', icon: IcRaces },
  { key: 'admin', label: 'Administration', icon: IcSettings },
]

export default function CoachDesktopApp({ cScreen, setCScreen }: Props) {
  const { profile, signOut } = useApp()
  const initials = (profile?.name ?? '').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  function renderScreen() {
    switch (cScreen) {
      case 'groups': return <CoachGroups />
      case 'sessions': return <CoachSessions />
      case 'community': return <CoachCommunity />
      case 'messaging': return <CoachMessaging />
      case 'clubstats': return <CoachStats />
      case 'races': return <CoachRaces />
      case 'admin': return <CoachAdmin />
      default: return <CoachDashboard />
    }
  }

  return (
    <div className="hidden lg:flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="flex flex-col w-56 flex-shrink-0 py-6 px-4"
        style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: '#F2C400', color: '#000' }}>A</div>
          <span className="font-black text-sm tracking-tight" style={{ color: 'var(--text-1)' }}>ALLURE</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const active = cScreen === item.key || (item.key === 'dashboard' && !NAV_ITEMS.some((n) => n.key !== 'dashboard' && n.key === cScreen))
            const Icon = item.icon
            return (
              <button key={item.key} onClick={() => setCScreen(item.key)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors"
                style={{ background: active ? '#F2C400' : 'transparent', color: active ? '#000' : 'var(--text-2)' }}>
                <Icon c={active ? '#000' : 'var(--text-2)'} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <button onClick={signOut} className="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-4 text-left"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: '#F2C400', color: '#000' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate" style={{ color: 'var(--text-1)' }}>{profile?.name}</div>
            <div className="text-[10px] truncate" style={{ color: 'var(--text-2)' }}>Se déconnecter</div>
          </div>
        </button>
      </aside>

      {/* Main area */}
      <main className="flex-1 overflow-y-auto">
        {renderScreen()}
      </main>
    </div>
  )
}
