import { useState } from 'react'
import { Card, SectionLabel, BtnPrimary, BtnSecondary, Avatar } from '../components/ui'
import { useApp } from '../context/AppContext'

const INTEGRATIONS = [
  { name: 'Strava', emoji: '🟠', connected: true, since: 'Connecté depuis mars 2025' },
  { name: 'Apple Santé', emoji: '🍎', connected: true, since: 'Connecté depuis jan. 2026' },
  { name: 'Garmin Connect', emoji: '⌚', connected: false, since: null },
  { name: 'Coros', emoji: '⌚', connected: false, since: null },
  { name: 'Google Fit', emoji: '🟢', connected: false, since: null },
]

const TOP_RECORDS = [
  { dist: '1500m', time: "4'12\"", date: 'Mars 2026', sb: true },
  { dist: '5 km', time: "16'22\"", date: 'Juin 2026', sb: false },
  { dist: '10 km', time: "33'47\"", date: 'Avr 2026', sb: false },
]

const INJURY_HISTORY = [
  { date: 'Fév 2026', type: 'Tendinite rotulienne droite', duration: '12 jours', severity: 'légère' },
  { date: 'Oct 2025', type: 'Contracture mollet gauche', duration: '5 jours', severity: 'légère' },
  { date: 'Juin 2025', type: 'Périostite tibiale', duration: '3 semaines', severity: 'modérée' },
]

const SEVERITY_COLOR: Record<string, string> = {
  légère: '#3D9E4A',
  modérée: '#F2C400',
  grave: '#C94040',
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="relative w-12 h-6 rounded-full shrink-0 transition-all duration-300"
      style={{ background: on ? '#F2C400' : 'var(--surface3)' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300"
        style={{ left: on ? '26px' : '2px' }} />
    </button>
  )
}

function IcSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5V2.5M8 13.5V14.5M1.5 8H2.5M13.5 8H14.5M3.4 3.4L4.1 4.1M11.9 11.9L12.6 12.6M12.6 3.4L11.9 4.1M4.1 11.9L3.4 12.6"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IcMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 9.5A6 6 0 1 1 6.5 2.5C4 3.5 2.5 6 2.5 8.5A6 6 0 0 0 13.5 9.5Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { isDark, toggleTheme, profile, signOut } = useApp()
  const isCoach = profile?.role === 'coach'
  const name = profile?.name ?? ''
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  const [notifs, setNotifs] = useState({
    messages: true,
    sessions: true,
    reminders: false,
    competitions: true,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto md:max-w-xl">
      {/* Back button (mobile) */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onBack}
          className="md:hidden w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--card)', color: 'var(--text-2)', boxShadow: 'var(--card-shadow)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L5 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Profil</h1>
      </div>

      {/* Identity hero card */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black"
              style={{
                background: isCoach ? '#F2C400' : 'var(--avatar)',
                color: isCoach ? '#0E0E0D' : 'var(--avatar-text)',
                border: '3px solid #F2C400',
              }}>
              {initials}
            </div>
            <span className="absolute bottom-0 right-0 w-5 h-5 bg-[#5EBA65] rounded-full flex items-center justify-center"
              style={{ border: '2px solid var(--card)' }}>
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black leading-tight" style={{ color: 'var(--text-1)' }}>
              {name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Club Paris Athlétisme</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest"
                style={{ background: isCoach ? '#F2C400' : 'rgba(242,196,0,0.12)', color: isCoach ? '#0E0E0D' : '#F2C400' }}>
                {isCoach ? 'Coach' : 'Élite'}
              </span>
              <span className="text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"
                style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                {isCoach ? 'Entraîneur FFA' : 'Athlète senior'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'Email', value: profile?.email ?? '' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-2)' }}>Profil FFA</span>
            <a href="#" className="text-sm font-medium text-[#F2C400] underline underline-offset-2">athle.fr →</a>
          </div>
        </div>
      </Card>

      {/* Coach référent (athlete only) */}
      {!isCoach && (
        <Card>
          <SectionLabel>Coach référent</SectionLabel>
          <div className="flex items-center gap-3">
            <Avatar initials="ML" size={44} yellow />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Marc Leroy</p>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>Coach · Groupe Élite & Confirmé</p>
              <p className="text-xs text-[#5EBA65]">En ligne</p>
            </div>
            <button className="text-xs font-bold px-3 py-2 rounded-[12px] bg-[#F2C400] text-[#0E0E0D]">
              Message
            </button>
          </div>
        </Card>
      )}

      {/* Records (athlete) */}
      {!isCoach && (
        <Card>
          <SectionLabel>Mes meilleurs records</SectionLabel>
          <div className="space-y-0.5">
            {TOP_RECORDS.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: i < TOP_RECORDS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{r.dist}</span>
                <div className="flex items-center gap-3">
                  {r.sb && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{ background: 'rgba(242,196,0,0.15)', color: '#F2C400' }}>SB</span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-2)' }}>{r.date}</span>
                  <span className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{r.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Injury history (athlete) */}
      {!isCoach && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Historique blessures</SectionLabel>
            <button className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
              + Signaler
            </button>
          </div>
          {INJURY_HISTORY.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucune blessure enregistrée</p>
          ) : (
            <div className="space-y-0">
              {INJURY_HISTORY.map((inj, i) => (
                <div key={i} className="flex items-start gap-3 py-3"
                  style={{ borderBottom: i < INJURY_HISTORY.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: SEVERITY_COLOR[inj.severity] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{inj.type}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{inj.duration} · {inj.date}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize"
                    style={{
                      background: `${SEVERITY_COLOR[inj.severity]}18`,
                      color: SEVERITY_COLOR[inj.severity],
                    }}>
                    {inj.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Appearance — dark/light toggle */}
      <Card>
        <SectionLabel>Apparence</SectionLabel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: isDark ? 'rgba(242,196,0,0.15)' : 'var(--surface2)', color: isDark ? '#F2C400' : 'var(--text-2)' }}>
              {isDark ? <IcSun /> : <IcMoon />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                Mode {isDark ? 'sombre' : 'clair'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                Basculer l&apos;apparence de l&apos;interface
              </p>
            </div>
          </div>
          <button onClick={toggleTheme}
            className="relative w-12 h-6 rounded-full transition-all duration-300"
            style={{ background: isDark ? '#F2C400' : 'var(--surface3)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 flex items-center justify-center"
              style={{ left: isDark ? '26px' : '2px' }}>
              {isDark
                ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="2" stroke="#0E0E0D" strokeWidth="1.2" /><path d="M5 1.5V2.5M5 7.5V8.5M1.5 5H2.5M7.5 5H8.5" stroke="#0E0E0D" strokeWidth="1.2" strokeLinecap="round" /></svg>
                : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8.5 6C8 7.5 6.5 8.5 5 8.5C3 8.5 1.5 7 1.5 5C1.5 3.5 2.5 2 3.5 1.5C2.5 2.5 2.5 4.5 4 5.5C5.5 6.5 7.5 6 8.5 6Z" stroke="#6B6A63" strokeWidth="1.2" strokeLinejoin="round" /></svg>
              }
            </span>
          </button>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <SectionLabel>Notifications</SectionLabel>
        <div className="space-y-4">
          {[
            { key: 'messages' as const, label: 'Messages', sub: 'Nouveaux messages de coach ou groupe' },
            { key: 'sessions' as const, label: 'Séances publiées', sub: 'Nouvelle séance assignée' },
            { key: 'reminders' as const, label: 'Rappels bilan', sub: 'Rappel quotidien de bilan de forme' },
            { key: 'competitions' as const, label: 'Compétitions', sub: 'Rappels avant une échéance' },
          ].map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{sub}</p>
              </div>
              <Toggle on={notifs[key]} onChange={(v) => setNotifs((prev) => ({ ...prev, [key]: v }))} />
            </div>
          ))}
        </div>
      </Card>

      {/* Integrations */}
      <Card>
        <SectionLabel>Intégrations</SectionLabel>
        <div className="space-y-3">
          {INTEGRATIONS.map(({ name, emoji, connected, since }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-xl w-8 shrink-0 text-center">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{name}</p>
                <p className="text-xs" style={{ color: connected ? '#5EBA65' : 'var(--text-2)' }}>
                  {connected ? since : 'Non connecté'}
                </p>
              </div>
              <button className="text-xs font-semibold px-3 py-1.5 rounded-[12px] shrink-0 transition-colors"
                style={{
                  background: connected ? 'var(--surface2)' : '#F2C400',
                  color: connected ? 'var(--text-2)' : '#0E0E0D',
                }}>
                {connected ? 'Déconnecter' : 'Connecter'}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Account */}
      <Card>
        <SectionLabel>Compte</SectionLabel>
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-[12px] text-sm font-medium transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
            Changer le mot de passe
          </button>
          <button className="w-full text-left px-4 py-3 rounded-[12px] text-sm font-medium transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
            Feedback & suggestions
          </button>
          <button onClick={signOut} className="w-full text-left px-4 py-3 rounded-[12px] text-sm font-medium text-[#C94040] transition-colors"
            style={{ background: 'rgba(201,64,64,0.08)' }}>
            Se déconnecter
          </button>
        </div>
      </Card>

      <p className="text-center text-[10px] pb-4" style={{ color: 'var(--text-2)' }}>RunCoach v2.1.0 · Club Paris Athlétisme</p>
    </div>
  )
}
