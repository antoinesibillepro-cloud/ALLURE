import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Role = 'athlete' | 'coach'

export interface Profile {
  id: string
  club_id: string
  role: Role
  name: string
  avatar_url: string | null
  email: string
  vma: number | null
  category: string | null
  notification_prefs: { messages: boolean; sessions: boolean; reminders: boolean; competitions: boolean }
}

interface AppCtx {
  isDark: boolean
  toggleTheme: () => void
  session: Session | null
  profile: Profile | null
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
  /** True once Supabase detects a password-recovery link was just opened — show the "set new password" screen instead of the app. */
  passwordRecovery: boolean
  clearPasswordRecovery: () => void
}

const Ctx = createContext<AppCtx>({} as AppCtx)

const THEME_KEY = 'allure-theme'

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export function AppProvider({ children }: { children: ReactNode }) {
  const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : null
  const [isDark, setIsDark] = useState(savedTheme ? savedTheme === 'dark' : prefersDark())
  const [themeExplicit, setThemeExplicit] = useState(savedTheme !== null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Follow the OS light/dark setting live, unless the person has explicitly picked a theme themselves.
  useEffect(() => {
    if (themeExplicit || typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [themeExplicit])

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data as Profile | null)
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setProfileLoading(false))
      else setProfileLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setSession(newSession)
      if (newSession?.user) {
        setProfileLoading(true)
        loadProfile(newSession.user.id).finally(() => setProfileLoading(false))
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider
      value={{
        isDark,
        toggleTheme: () => setIsDark((v) => {
          const next = !v
          setThemeExplicit(true)
          localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
          return next
        }),
        session,
        profile,
        profileLoading,
        refreshProfile,
        signOut: async () => { await supabase.auth.signOut() },
        passwordRecovery,
        clearPasswordRecovery: () => setPasswordRecovery(false),
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
