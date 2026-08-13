import { useState, useEffect, type ReactElement } from 'react'
import { fetchConversations, fetchUnreadCounts, subscribeToAnyMessage } from './lib/queries/messages'
import { subscribeToOwnMessages, fireNotification } from './lib/notifications'
import { useApp } from './context/AppContext'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import TrainingScreen from './screens/TrainingScreen'
import MessagingScreen from './screens/MessagingScreen'
import StatsScreen from './screens/StatsScreen'
import ProfileScreen from './screens/ProfileScreen'
import CoachDashboard from './screens/coach/CoachDashboard'
import CoachGroups from './screens/coach/CoachGroups'
import CoachSessions from './screens/coach/CoachSessions'
import CoachStats from './screens/coach/CoachStats'
import CoachMessaging from './screens/coach/CoachMessaging'
import ClubScreen from './screens/ClubScreen'
import CommunityScreen from './screens/CommunityScreen'
import CoachCommunity from './screens/coach/CoachCommunity'
import CoachAdmin from './screens/coach/CoachAdmin'
import CoachAthletes from './screens/coach/CoachAthletes'
import CoachRaces from './screens/coach/CoachRaces'
import GlobalSearch from './components/GlobalSearch'
import NotificationBell from './components/NotificationBell'
import type { SearchResult } from './lib/queries/search'

// ── Icons ──────────────────────────────────────────────
function IcHome({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 8.5L10 2L18 8.5V18H13V13H7V18H2V8.5Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill={active ? 'rgba(242,196,0,0.12)' : 'none'} />
    </svg>
  )
}
function IcTraining({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke={c} strokeWidth="1.5" />
      <path d="M10 6V10.5L13.5 12.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IcMessage({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M17 3H3C2.4 3 2 3.4 2 4V13C2 13.6 2.4 14 3 14H8L10 17.5L12 14H17C17.6 14 18 13.6 18 13V4C18 3.4 17.6 3 17 3Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill={active ? 'rgba(242,196,0,0.12)' : 'none'} />
    </svg>
  )
}
function IcStats({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="12" width="3.5" height="6" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="8.25" y="7" width="3.5" height="11" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="14.5" y="2" width="3.5" height="16" rx="1" stroke={c} strokeWidth="1.5" />
    </svg>
  )
}
function IcDashboard({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="2" stroke={c} strokeWidth="1.5" />
    </svg>
  )
}
function IcAthletes({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="6" r="3.5" stroke={c} strokeWidth="1.5" />
      <path d="M3 18C3 14.5 6 11.5 10 11.5C14 11.5 17 14.5 17 18" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IcGroups({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="7" r="3" stroke={c} strokeWidth="1.5" />
      <circle cx="14" cy="7" r="3" stroke={c} strokeWidth="1.5" />
      <path d="M1 17C1 14.5 3.5 12.5 7 12.5C10.5 12.5 13 14.5 13 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 12.5C17.5 12.5 19 14.5 19 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IcSessions({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="14" rx="2" stroke={c} strokeWidth="1.5" />
      <path d="M6 2V6M14 2V6M2 9H18" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 13H10M6 16H14" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
function IcClub({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill={active ? 'rgba(242,196,0,0.12)' : 'none'} />
    </svg>
  )
}
function IcCommunity({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="6" r="3" stroke={c} strokeWidth="1.5" />
      <circle cx="14.5" cy="6.5" r="2.5" stroke={c} strokeWidth="1.5" />
      <path d="M1 17C1 14.2 3.7 12 7 12C10.3 12 13 14.2 13 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13.5 12.5C16.5 12.5 19 14.2 19 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IcSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1.5V2.5M8 13.5V14.5M1.5 8H2.5M13.5 8H14.5M3.4 3.4L4.1 4.1M11.9 11.9L12.6 12.6M12.6 3.4L11.9 4.1M4.1 11.9L3.4 12.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
function IcMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 9.5A6 6 0 1 1 6.5 2.5C4 3.5 2.5 6 2.5 8.5A6 6 0 0 0 13.5 9.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
function IcSettings({ active }: { active: boolean }) {
  const c = active ? '#F2C400' : 'var(--text-2)'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.8" stroke={c} strokeWidth="1.5" />
      <path d="M10 2.5V4.5M10 15.5V17.5M17.5 10H15.5M4.5 10H2.5M15.1 4.9L13.7 6.3M6.3 13.7L4.9 15.1M15.1 15.1L13.7 13.7M6.3 6.3L4.9 4.9"
        stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
// ── Nav config ────────────────────────────────────────
type AScreen = 'home' | 'training' | 'community' | 'messaging' | 'stats' | 'club'
type CScreen = 'dashboard' | 'groups' | 'athletes' | 'sessions' | 'community' | 'messaging' | 'clubstats' | 'races' | 'admin'

interface NavItem<T extends string> {
  id: T
  label: string
  short: string
  icon: (active: boolean) => ReactElement
}

const ATHLETE_NAV: NavItem<AScreen>[] = [
  { id: 'home', label: 'Home', short: 'Home', icon: (a) => <IcHome active={a} /> },
  { id: 'training', label: 'Entraînements', short: 'Training', icon: (a) => <IcTraining active={a} /> },
  { id: 'community', label: 'Communauté', short: 'Communauté', icon: (a) => <IcCommunity active={a} /> },
  { id: 'messaging', label: 'Messagerie', short: 'Messages', icon: (a) => <IcMessage active={a} /> },
  { id: 'stats', label: 'Stats', short: 'Stats', icon: (a) => <IcStats active={a} /> },
  { id: 'club', label: 'Club', short: 'Club', icon: (a) => <IcClub active={a} /> },
]

const COACH_NAV: NavItem<CScreen>[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Dashboard', icon: (a) => <IcDashboard active={a} /> },
  { id: 'groups', label: 'Groupes', short: 'Groupes', icon: (a) => <IcGroups active={a} /> },
  { id: 'athletes', label: 'Athlètes', short: 'Athlètes', icon: (a) => <IcAthletes active={a} /> },
  { id: 'sessions', label: 'Séances', short: 'Séances', icon: (a) => <IcSessions active={a} /> },
  { id: 'community', label: 'Communauté', short: 'Communauté', icon: (a) => <IcCommunity active={a} /> },
  { id: 'messaging', label: 'Messagerie', short: 'Messages', icon: (a) => <IcMessage active={a} /> },
  { id: 'clubstats', label: 'Stats club', short: 'Stats', icon: (a) => <IcStats active={a} /> },
  { id: 'races', label: 'Courses', short: 'Courses', icon: (a) => <IcClub active={a} /> },
  { id: 'admin', label: 'Administration', short: 'Admin', icon: (a) => <IcSettings active={a} /> },
]

const A_TITLES: Record<AScreen, string> = {
  home: 'Tableau de bord', training: 'Entraînements', community: 'Communauté', messaging: 'Messagerie', stats: 'Statistiques', club: 'Club',
}
const C_TITLES: Record<CScreen, string> = {
  dashboard: 'Dashboard coach', groups: 'Groupes', athletes: 'Athlètes', sessions: 'Créer une séance', community: 'Communauté', messaging: 'Messagerie', clubstats: 'Statistiques club', races: 'Calendrier de courses', admin: 'Administration du club',
}

export default function App() {
  const { isDark, toggleTheme, session, profile, profileLoading, signOut } = useApp()
  const [aScreen, setAScreen] = useState<AScreen>('home')
  const [cScreen, setCScreen] = useState<CScreen>('dashboard')
  const [showProfile, setShowProfile] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    function isTextInput(el: Element | null) {
      if (!el) return false
      const tag = el.tagName
      if (tag === 'TEXTAREA') return true
      if (tag === 'INPUT') {
        const type = (el as HTMLInputElement).type
        return !['button', 'checkbox', 'radio', 'range', 'submit', 'file', 'color'].includes(type)
      }
      return false
    }
    function handleFocusIn(e: FocusEvent) { if (isTextInput(e.target as Element)) setKeyboardOpen(true) }
    function handleFocusOut(e: FocusEvent) { if (isTextInput(e.target as Element)) setKeyboardOpen(false) }
    window.addEventListener('focusin', handleFocusIn)
    window.addEventListener('focusout', handleFocusOut)
    return () => {
      window.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  // Real unread badge: initial count, then recount whenever any message lands.
  useEffect(() => {
    if (!profile) return
    let cancelled = false
    const recount = () => {
      fetchUnreadCounts(profile.id)
        .then((r) => { if (!cancelled) setUnread(r.total) })
        .catch(() => {})
    }
    recount()
    const unsub = subscribeToAnyMessage(recount)
    return () => { cancelled = true; unsub() }
  }, [profile?.id])

  // Recount when leaving the messaging screen, which is where reads get stamped.
  const onMessagingScreen = profile?.role === 'coach' ? cScreen === 'messaging' : aScreen === 'messaging'
  useEffect(() => {
    if (!profile || onMessagingScreen) return
    fetchUnreadCounts(profile.id).then((r) => setUnread(r.total)).catch(() => {})
  }, [onMessagingScreen, profile?.id])

  useEffect(() => {
    if (!profile) return
    let unsub: (() => void) | null = null
    let cancelled = false
    fetchConversations(profile.id, profile.club_id).then((convs) => {
      if (cancelled) return
      unsub = subscribeToOwnMessages(profile.id, convs.map((c) => c.id), ({ body }) => {
        if (profile.notification_prefs?.messages === false) return
        fireNotification('Nouveau message', body)
      })
    })
    return () => { cancelled = true; unsub?.() }
  }, [profile?.id, profile?.club_id, profile?.notification_prefs?.messages])

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#F2C400', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!session) return <AuthScreen />

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center" style={{ background: 'var(--bg)' }}>
        <div>
          <p className="font-bold mb-2" style={{ color: 'var(--text-1)' }}>Compte en attente</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
            Ton compte n'est pas encore rattaché à un club. Vérifie ton code d'invitation ou contacte ton coach.
          </p>
          <button onClick={signOut} className="text-sm font-semibold" style={{ color: '#F2C400' }}>Se déconnecter</button>
        </div>
      </div>
    )
  }

  const isCoach = profile.role === 'coach'
  const initials = profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const isMessaging = isCoach ? cScreen === 'messaging' : aScreen === 'messaging'
  const pageTitle = showProfile ? 'Profil' : isCoach ? C_TITLES[cScreen] : A_TITLES[aScreen]

  function renderContent() {
    if (showProfile) return <ProfileScreen onBack={() => setShowProfile(false)}
      onOpenAdmin={isCoach ? () => { setCScreen('admin'); setShowProfile(false) } : undefined}
      onOpenRaces={isCoach ? () => { setCScreen('races'); setShowProfile(false) } : undefined}
      onOpenGroups={isCoach ? () => { setCScreen('groups'); setShowProfile(false) } : undefined}
      onOpenCommunity={isCoach ? () => { setCScreen('community'); setShowProfile(false) } : undefined} />
    if (isCoach) {
      switch (cScreen) {
        case 'dashboard': return <CoachDashboard />
        case 'groups':    return <CoachGroups />
        case 'athletes':  return <CoachAthletes />
        case 'sessions':  return <CoachSessions />
        case 'community': return <CoachCommunity />
        case 'messaging': return <CoachMessaging />
        case 'clubstats': return <CoachStats />
        case 'races':     return <CoachRaces />
        case 'admin':     return <CoachAdmin />
      }
    }
    switch (aScreen) {
      case 'home': return <HomeScreen />
      case 'training': return <TrainingScreen />
      case 'community': return <CommunityScreen />
      case 'messaging': return <MessagingScreen />
      case 'stats': return <StatsScreen />
      case 'club': return <ClubScreen />
    }
  }

  function handleNav(id: string) {
    setShowProfile(false)
    if (isCoach) setCScreen(id as CScreen)
    else setAScreen(id as AScreen)
  }

  /** Sends the user to the screen that owns the picked search result. */
  function handleSearchPick(r: SearchResult) {
    setShowProfile(false)
    if (isCoach) {
      const dest: Record<SearchResult['kind'], CScreen> = {
        athlete: 'athletes', group: 'groups', session: 'sessions', race: 'races',
      }
      setCScreen(dest[r.kind])
    } else {
      const dest: Record<SearchResult['kind'], AScreen> = {
        athlete: 'club', group: 'club', session: 'training', race: 'training',
      }
      setAScreen(dest[r.kind])
    }
  }

  const navItems = isCoach ? COACH_NAV : ATHLETE_NAV
  const COACH_MOBILE_IDS: CScreen[] = ['dashboard', 'athletes', 'sessions', 'messaging', 'races']
  const mobileNavItems = isCoach
    ? COACH_NAV.filter((i) => COACH_MOBILE_IDS.includes(i.id))
    : ATHLETE_NAV.slice(0, 5)
  const activeId = showProfile ? '' : isCoach ? cScreen : aScreen

  const contentKey = showProfile ? 'profile' : activeId

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ════════════════════════════════ DESKTOP ════════════════════════════════ */}

      {/* ── Horizontal TopBar ── */}
      <header className="hidden lg:flex items-center h-[60px] fixed top-0 left-0 right-0 topbar-glass z-50"
        style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div className="w-full max-w-[1400px] mx-auto px-6 flex items-center gap-6 h-full">

          {/* Logo */}
          <button className="flex items-center gap-2.5 shrink-0 mr-4">
            <div className="w-8 h-8 rounded-xl bg-[#F2C400] flex items-center justify-center"
              style={{ boxShadow: '0 3px 10px rgba(242,196,0,0.35)' }}>
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5C6.5 1.5 4 4 4 7.5C4 10.5 5.5 12.5 7.5 13.5L9 16.5L10.5 13.5C12.5 12.5 14 10.5 14 7.5C14 4 11.5 1.5 9 1.5Z" fill="#0E0E0D" />
                <circle cx="9" cy="7.5" r="2" fill="#F2C400" />
              </svg>
            </div>
            <p className="font-black text-[15px] leading-none tracking-tight" style={{ color: 'var(--text-1)' }}>ALLURE</p>
          </button>

          {/* Club-wide search — athletes, groups, sessions, races */}
          <GlobalSearch clubId={profile.club_id} onPick={handleSearchPick} />

          {/* Nav links — text only like Strava */}
          <nav className="flex items-center h-full">
            {navItems.map((item) => {
              const active = item.id === activeId
              return (
                <button key={item.id} onClick={() => handleNav(item.id)}
                  className="btn-press relative h-full flex items-center px-4 text-sm transition-all"
                  style={{
                    color: active ? 'var(--text-1)' : 'var(--text-2)',
                    fontWeight: active ? 700 : 400,
                  }}>
                  {item.label}
                  {item.id === 'messaging' && unread > 0 && (
                    <span className="ml-1 min-w-4 h-4 px-1 bg-[#F2C400] text-[#0E0E0D] text-[9px] font-black rounded-full flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full bg-[#F2C400]" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="flex-1" />

          {/* Theme */}
          <button onClick={toggleTheme}
            className="btn-press w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
            {isDark ? <IcSun /> : <IcMoon />}
          </button>

          {/* Notifications — real feed (unread DMs, next sessions, next races) */}
          <NotificationBell
            profileId={profile.id}
            clubId={profile.club_id}
            isCoach={isCoach}
            onPick={(kind) => {
              setShowProfile(false)
              if (kind === 'message') handleNav('messaging')
              else if (kind === 'session') handleNav(isCoach ? 'sessions' : 'training')
              else handleNav(isCoach ? 'races' : 'training')
            }}
          />

          {/* Avatar + chevron — like Strava */}
          <button onClick={() => setShowProfile(true)}
            className="btn-press flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full"
            style={{ background: 'var(--surface2)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ background: isCoach ? '#F2C400' : 'var(--avatar)', color: isCoach ? '#0E0E0D' : 'var(--avatar-text)' }}>
              {initials}
            </div>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--text-2)' }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className={`lg:pt-[60px] ${isMessaging && !showProfile ? '' : 'min-h-screen pb-28 lg:pb-6'}`}>
        {/*
          The messaging screen renders a `position: fixed` full-screen overlay on mobile.
          `page-enter` animates a transform and keeps it (fill-mode: both), and any
          transform on an ancestor becomes the containing block for fixed descendants —
          which collapsed that overlay to the 0-height <main> and blanked the screen.
          So messaging opts out of the page transition.
        */}
        <div key={contentKey} className={isMessaging && !showProfile ? 'h-full' : 'page-enter h-full'}>
          {renderContent()}
        </div>
      </main>

      {/* ════════════════════════════════ MOBILE ════════════════════════════════ */}

      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-200"
        style={keyboardOpen ? { opacity: 0, transform: 'translate(-50%, 24px)', pointerEvents: 'none' } : undefined}>
        <nav className="glass-capsule rounded-[30px] px-1.5 py-2 flex items-center gap-0">
          {mobileNavItems.map((item) => {
            const active = item.id === activeId
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className="relative flex flex-col items-center gap-1 px-2.5 py-2 rounded-[22px] transition-all duration-200"
                style={{
                  background: active ? 'rgba(242,196,0,0.14)' : 'transparent',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                {item.icon(active)}
                <span className="text-[9px] font-semibold"
                  style={{ color: active ? '#F2C400' : 'var(--text-2)', transition: 'color 0.15s ease' }}>
                  {item.short}
                </span>
                {item.id === 'messaging' && unread > 0 && (
                  <span className="absolute top-1 right-1.5 min-w-[15px] h-[15px] px-1 bg-[#F2C400] text-[#0E0E0D] text-[8px] font-black rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            )
          })}
          <button onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-[22px] transition-all"
            style={{
              background: showProfile ? 'rgba(242,196,0,0.14)' : 'transparent',
              transform: showProfile ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black"
              style={{ background: isCoach ? '#F2C400' : 'var(--avatar)', color: isCoach ? '#0E0E0D' : 'var(--avatar-text)' }}>
              {initials}
            </div>
            <span className="text-[9px] font-semibold" style={{ color: showProfile ? '#F2C400' : 'var(--text-2)' }}>Profil</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
