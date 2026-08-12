import { useApp } from '../../context/AppContext'
import CoachDashboard from './CoachDashboard'
import CoachGroups from './CoachGroups'
import CoachSessions from './CoachSessions'
import CoachStats from './CoachStats'
import CoachMessaging from './CoachMessaging'
import CoachCommunity from './CoachCommunity'

interface Props {
  cScreen: string
  setCScreen: (s: string) => void
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'groups', label: 'Groupes', icon: '👥' },
  { key: 'sessions', label: 'Séances', icon: '📅' },
  { key: 'community', label: 'Communauté', icon: '🏆' },
  { key: 'messaging', label: 'Messages', icon: '💬' },
  { key: 'clubstats', label: 'Stats club', icon: '📈' },
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
            return (
              <button key={item.key} onClick={() => setCScreen(item.key)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors"
                style={{ background: active ? '#F2C400' : 'transparent', color: active ? '#000' : 'var(--text-2)' }}>
                <span>{item.icon}</span>
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
