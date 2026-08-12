import { useState } from 'react'
import { Card, SectionLabel, Avatar } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchStravaStatus, connectStrava } from '../lib/queries/strava'
import { supabase } from '../lib/supabase'
import {
  fetchClubName, fetchReferentCoach, fetchPersonalRecords, createPersonalRecord, deletePersonalRecord,
  fetchInjuries, createInjury, saveNotificationPrefs, type PersonalRecord, type Injury, type NotificationPrefs,
} from '../lib/queries/profileExtras'

const OTHER_INTEGRATIONS = [
  { name: 'Apple Santé' },
  { name: 'Garmin Connect' },
  { name: 'Coros' },
  { name: 'Google Fit' },
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

export default function ProfileScreen({ onBack, onOpenAdmin, onOpenRaces }: { onBack: () => void; onOpenAdmin?: () => void; onOpenRaces?: () => void }) {
  const { isDark, toggleTheme, profile, signOut } = useApp()
  const isCoach = profile?.role === 'coach'
  const name = profile?.name ?? ''
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  const [notifs, setNotifs] = useState<NotificationPrefs>(
    profile?.notification_prefs ?? { messages: true, sessions: true, reminders: false, competitions: true },
  )

  const { data: clubName } = useQuery(() => (profile ? fetchClubName(profile.club_id) : Promise.resolve('')), [profile?.club_id])
  const { data: referent } = useQuery(
    () => (profile && !isCoach ? fetchReferentCoach(profile.club_id) : Promise.resolve(null)),
    [profile?.club_id, isCoach],
  )
  const { data: records, refetch: refetchRecords } = useQuery<PersonalRecord[]>(
    () => (profile && !isCoach ? fetchPersonalRecords(profile.id) : Promise.resolve([])),
    [profile?.id, isCoach],
  )
  const { data: injuries, refetch: refetchInjuries } = useQuery<Injury[]>(
    () => (profile && !isCoach ? fetchInjuries(profile.id) : Promise.resolve([])),
    [profile?.id, isCoach],
  )

  const [showAddRecord, setShowAddRecord] = useState(false)
  const [newDiscipline, setNewDiscipline] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newRecordDate, setNewRecordDate] = useState(new Date().toISOString().slice(0, 10))
  const [savingRecord, setSavingRecord] = useState(false)

  const [showAddInjury, setShowAddInjury] = useState(false)
  const [newInjuryType, setNewInjuryType] = useState('')
  const [newInjuryDate, setNewInjuryDate] = useState(new Date().toISOString().slice(0, 10))
  const [newInjuryDuration, setNewInjuryDuration] = useState('')
  const [newInjurySeverity, setNewInjurySeverity] = useState<'légère' | 'modérée' | 'grave'>('légère')
  const [savingInjury, setSavingInjury] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  async function toggleNotif(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...notifs, [key]: value }
    setNotifs(next)
    if (profile) await saveNotificationPrefs(profile.id, next)
  }

  async function handleAddRecord() {
    if (!profile || !newDiscipline.trim() || !newValue.trim()) return
    setSavingRecord(true)
    try {
      await createPersonalRecord(profile.id, newDiscipline.trim(), newValue.trim(), newRecordDate)
      setNewDiscipline(''); setNewValue('')
      setShowAddRecord(false)
      await refetchRecords()
    } finally {
      setSavingRecord(false)
    }
  }

  async function handleDeleteRecord(id: string) {
    await deletePersonalRecord(id)
    await refetchRecords()
  }

  async function handleAddInjury() {
    if (!profile || !newInjuryType.trim()) return
    setSavingInjury(true)
    try {
      await createInjury(profile.id, { type: newInjuryType.trim(), date: newInjuryDate, duration_text: newInjuryDuration || null, severity: newInjurySeverity })
      setNewInjuryType(''); setNewInjuryDuration('')
      setShowAddInjury(false)
      await refetchInjuries()
    } finally {
      setSavingInjury(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) { setPasswordMsg('8 caractères minimum.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordMsg(error ? error.message : 'Mot de passe mis à jour ✓')
    if (!error) { setNewPassword(''); setTimeout(() => setShowPasswordForm(false), 1500) }
  }

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
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black leading-tight" style={{ color: 'var(--text-1)' }}>
              {name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{clubName}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest"
                style={{ background: isCoach ? '#F2C400' : 'rgba(242,196,0,0.12)', color: isCoach ? '#0E0E0D' : '#F2C400' }}>
                {isCoach ? 'Coach' : 'Athlète'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-2)' }}>Email</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{profile?.email ?? ''}</span>
          </div>
          {!isCoach && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>VMA</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{profile?.vma ? `${profile.vma} km/h` : 'Non renseignée'}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Coach référent (athlete only) */}
      {!isCoach && (
        <Card>
          <SectionLabel>Coach référent</SectionLabel>
          {!referent ? (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucun coach n'a encore rejoint ton club.</p>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar initials={referent.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={44} yellow />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{referent.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>Coach du club</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Records (athlete) */}
      {!isCoach && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Mes meilleurs records</SectionLabel>
            <button onClick={() => setShowAddRecord((v) => !v)} className="text-xs font-semibold" style={{ color: '#F2C400' }}>+ Ajouter</button>
          </div>
          {showAddRecord && (
            <div className="mb-3 p-3 rounded-xl space-y-2" style={{ background: 'var(--surface2)' }}>
              <div className="grid grid-cols-2 gap-2">
                <input value={newDiscipline} onChange={(e) => setNewDiscipline(e.target.value)} placeholder="Distance (ex: 5 km)"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Temps (ex: 18'32&quot;)"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              </div>
              <input type="date" value={newRecordDate} onChange={(e) => setNewRecordDate(e.target.value)}
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              <button onClick={handleAddRecord} disabled={savingRecord || !newDiscipline.trim() || !newValue.trim()}
                className="text-xs font-bold px-3 py-1.5 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                {savingRecord ? '…' : 'Ajouter'}
              </button>
            </div>
          )}
          {!records?.length ? (
            <p className="text-sm text-center py-3" style={{ color: 'var(--text-2)' }}>Aucun record enregistré.</p>
          ) : (
            <div className="space-y-0.5">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{r.discipline}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'var(--text-2)' }}>{new Date(r.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                    <span className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{r.value}</span>
                    <button onClick={() => handleDeleteRecord(r.id)} className="text-xs font-semibold text-[#E4574A]">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Injury history (athlete) */}
      {!isCoach && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Historique blessures</SectionLabel>
            <button onClick={() => setShowAddInjury((v) => !v)} className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
              + Signaler
            </button>
          </div>
          {showAddInjury && (
            <div className="mb-3 p-3 rounded-xl space-y-2" style={{ background: 'var(--surface2)' }}>
              <input value={newInjuryType} onChange={(e) => setNewInjuryType(e.target.value)} placeholder="Type de blessure"
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={newInjuryDate} onChange={(e) => setNewInjuryDate(e.target.value)}
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                <input value={newInjuryDuration} onChange={(e) => setNewInjuryDuration(e.target.value)} placeholder="Durée (ex: 12 jours)"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              </div>
              <div className="flex gap-2">
                {(['légère', 'modérée', 'grave'] as const).map((s) => (
                  <button key={s} onClick={() => setNewInjurySeverity(s)} className="flex-1 py-1.5 rounded-[10px] text-xs font-bold capitalize"
                    style={{ background: newInjurySeverity === s ? SEVERITY_COLOR[s] : 'var(--card)', color: newInjurySeverity === s ? '#0E0E0D' : 'var(--text-2)' }}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={handleAddInjury} disabled={savingInjury || !newInjuryType.trim()}
                className="text-xs font-bold px-3 py-1.5 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                {savingInjury ? '…' : 'Enregistrer'}
              </button>
            </div>
          )}
          {!injuries?.length ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucune blessure enregistrée</p>
          ) : (
            <div className="space-y-0">
              {injuries.map((inj) => (
                <div key={inj.id} className="flex items-start gap-3 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: SEVERITY_COLOR[inj.severity] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{inj.type}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                      {inj.duration_text ? `${inj.duration_text} · ` : ''}{new Date(inj.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize"
                    style={{ background: `${SEVERITY_COLOR[inj.severity]}18`, color: SEVERITY_COLOR[inj.severity] }}>
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
              <Toggle on={notifs[key]} onChange={(v) => toggleNotif(key, v)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Integrations */}
      <Card>
        <SectionLabel>Intégrations</SectionLabel>
        <div className="space-y-3">
          <StravaIntegrationRow />
          {OTHER_INTEGRATIONS.map(({ name: intName }) => (
            <div key={intName} className="flex items-center gap-3">
              <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>{intName[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{intName}</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>Bientôt disponible</p>
              </div>
              <button disabled className="text-xs font-semibold px-3 py-1.5 rounded-[12px] shrink-0 opacity-40"
                style={{ background: '#F2C400', color: '#0E0E0D' }}>
                Connecter
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Account */}
      <Card>
        <SectionLabel>Compte</SectionLabel>
        <div className="space-y-2">
          <button onClick={() => setShowPasswordForm((v) => !v)} className="w-full text-left px-4 py-3 rounded-[12px] text-sm font-medium transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
            Changer le mot de passe
          </button>
          {showPasswordForm && (
            <div className="p-3 rounded-[12px] space-y-2" style={{ background: 'var(--surface2)' }}>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe"
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
              {passwordMsg && <p className="text-xs" style={{ color: passwordMsg.includes('✓') ? '#5EBA65' : '#E4574A' }}>{passwordMsg}</p>}
              <button onClick={handleChangePassword} className="text-xs font-bold px-3 py-1.5 rounded-[10px]" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                Mettre à jour
              </button>
            </div>
          )}
          {onOpenRaces && (
            <button onClick={onOpenRaces} className="w-full text-left px-4 py-3 rounded-[12px] text-sm font-medium transition-colors"
              style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
              Calendrier de courses
            </button>
          )}
          {onOpenAdmin && (
            <button onClick={onOpenAdmin} className="w-full text-left px-4 py-3 rounded-[12px] text-sm font-medium transition-colors"
              style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
              Administration du club
            </button>
          )}
          <button onClick={signOut} className="w-full text-left px-4 py-3 rounded-[12px] text-sm font-medium text-[#C94040] transition-colors"
            style={{ background: 'rgba(201,64,64,0.08)' }}>
            Se déconnecter
          </button>
        </div>
      </Card>

      <p className="text-center text-[10px] pb-4" style={{ color: 'var(--text-2)' }}>ALLURE · {clubName}</p>
    </div>
  )
}

function StravaIntegrationRow() {
  const { data: status, loading, refetch } = useQuery(() => fetchStravaStatus(), [])
  const [connecting, setConnecting] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const justReturned = params.get('strava')
  if (justReturned) {
    window.history.replaceState({}, '', window.location.pathname)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(252,82,0,0.12)' }}>
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
          <path d="M6 1L7.5 4.5H11L8 6.5L9.5 10.5L6 8L2.5 10.5L4 6.5L1 4.5H4.5L6 1Z" fill="#FC5200" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Strava</p>
        <p className="text-xs" style={{ color: status?.connected ? '#5EBA65' : 'var(--text-2)' }}>
          {loading ? '…' : status?.connected
            ? `Connecté depuis le ${new Date(status.connectedAt!).toLocaleDateString('fr-FR')}`
            : justReturned === 'error' ? 'Échec de la connexion, réessaie' : 'Non connecté'}
        </p>
      </div>
      {!status?.connected && (
        <button disabled={connecting} onClick={async () => { setConnecting(true); await connectStrava() }}
          className="text-xs font-semibold px-3 py-1.5 rounded-[12px] shrink-0 transition-colors disabled:opacity-50"
          style={{ background: '#F2C400', color: '#0E0E0D' }}>
          {connecting ? '…' : 'Connecter'}
        </button>
      )}
      {status?.connected && (
        <button onClick={() => refetch()} className="text-xs font-semibold px-3 py-1.5 rounded-[12px] shrink-0"
          style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
          Actualiser
        </button>
      )}
    </div>
  )
}
