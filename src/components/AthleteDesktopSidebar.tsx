import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchAthleteWeekStats, fetchLastActivity } from '../lib/queries/stats'
import { fetchAthleteSessions, type AthleteSession } from '../lib/queries/sessions'

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - day)
  return s
}

/** Shared left-hand desktop sidebar for athlete screens: profile, week mini-calendar, journal link, sport icons. */
export default function AthleteDesktopSidebar({ selectedDay, onSelectDay }: { selectedDay?: number; onSelectDay?: (i: number) => void }) {
  const { profile } = useApp()
  const athleteName = profile?.name ?? ''
  const initials = athleteName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  const today = new Date()
  const weekStartDate = startOfWeek(today)
  const weekStart = isoDate(weekStartDate)
  const weekEnd = isoDate(new Date(weekStartDate.getTime() + 7 * 24 * 3600 * 1000))
  const weekDates = Array.from({ length: 7 }, (_, i) => new Date(weekStartDate.getTime() + i * 86400000))
  const internalSelected = selectedDay ?? (today.getDay() + 6) % 7

  const { data: weekStats } = useQuery(
    () => (profile ? fetchAthleteWeekStats(profile.id, weekStart, weekEnd) : Promise.resolve(null)),
    [profile?.id, weekStart],
  )
  const { data: lastActivity } = useQuery(
    () => (profile ? fetchLastActivity(profile.id) : Promise.resolve(null)),
    [profile?.id],
  )
  const { data: weekSessions } = useQuery<AthleteSession[]>(
    () => (profile ? fetchAthleteSessions(profile.id, weekStart, weekEnd) : Promise.resolve([])),
    [profile?.id, weekStart],
  )
  const dayStatusByDate = new Map<string, 'done' | 'todo'>()
  for (const s of weekSessions ?? []) {
    const d = isoDate(new Date(s.scheduled_at))
    if (s.completion?.status === 'done') dayStatusByDate.set(d, 'done')
    else if (!dayStatusByDate.has(d)) dayStatusByDate.set(d, 'todo')
  }

  return (
    <div className="space-y-3">
      {/* Card 1: Profile */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        <div className="flex flex-col items-center px-5 pt-6 pb-5">
          <div className="relative mb-3">
            <div className="w-20 h-20 flex items-center justify-center text-2xl font-black overflow-hidden"
              style={{
                background: 'var(--avatar)',
                color: 'var(--avatar-text)',
                clipPath: profile?.avatar_url ? undefined : 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                borderRadius: profile?.avatar_url ? '9999px' : undefined,
              }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#F2C400] flex items-center justify-center"
              style={{ border: '2px solid var(--card)' }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4.5 7.5L8.5 3" stroke="#0E0E0D" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <p className="text-[17px] font-black leading-tight text-center" style={{ color: 'var(--text-1)' }}>
            {athleteName}
          </p>
          <div className="flex w-full mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Séances', value: `${weekStats?.sessionsDone ?? 0}/${weekStats?.sessionsPlanned ?? 0}` },
              { label: 'km / sem.', value: `${Math.round(weekStats?.kmDone ?? 0)}` },
            ].map((s, i) => (
              <div key={s.label} className="flex-1 text-center relative">
                {i > 0 && <div className="absolute left-0 top-1 bottom-1 w-px" style={{ background: 'var(--border)' }} />}
                <p className="text-lg font-black leading-none" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-2)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2: Dernière activité + semaine */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        <div className="px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-2)' }}>Dernière activité</p>
          {!lastActivity ? (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucune activité pour l'instant</p>
          ) : (
            <>
              <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{lastActivity.title}</p>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                {new Date(lastActivity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                {lastActivity.distanceKm ? ` · ${lastActivity.distanceKm} km` : ''}
              </p>
            </>
          )}
        </div>
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-1)' }}>Cette semaine</p>
          <div className="grid grid-cols-7 gap-1">
            {['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'].map((d, i) => {
              const status = dayStatusByDate.get(isoDate(weekDates[i])) ?? null
              const isSelected = i === internalSelected
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-2)' }}>{d}</span>
                  <button onClick={() => onSelectDay?.(i)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                    style={{
                      background: isSelected ? '#F2C400' : status === 'done' ? 'rgba(94,186,101,0.18)' : 'var(--surface2)',
                      color: isSelected ? '#0E0E0D' : status === 'done' ? '#5EBA65' : 'var(--text-2)',
                    }}>
                    {weekDates[i].getDate()}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Card 3: Journal link */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        <button className="btn-press w-full flex items-center justify-between px-5 py-3 text-sm font-semibold"
          style={{ color: 'var(--text-1)', background: 'transparent' }}>
          <span>Votre journal d&apos;entraînement</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Card 4: Sport icons */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', padding: '16px' }}>
        <div className="flex items-center justify-around">
          {[
            { label: 'Course', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 16L8 10L11 13L14 8L17 11" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="16" cy="5" r="2" stroke="var(--text-2)" strokeWidth="1.3" /></svg>, active: true },
            { label: 'Vélo', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="6" cy="14" r="4" stroke="var(--text-2)" strokeWidth="1.3" /><circle cx="16" cy="14" r="4" stroke="var(--text-2)" strokeWidth="1.3" /><path d="M16 14L13 8H9L6 14M13 8L16 10" stroke="var(--text-2)" strokeWidth="1.3" strokeLinecap="round" /></svg>, active: false },
            { label: 'Natation', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 13C5 11 8 15 11 13C14 11 17 15 19 13M3 17C5 15 8 19 11 17C14 15 17 19 19 17" stroke="var(--text-2)" strokeWidth="1.3" strokeLinecap="round" /><circle cx="15" cy="6" r="2" stroke="var(--text-2)" strokeWidth="1.3" /></svg>, active: false },
            { label: 'Muscu', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 11H5M17 11H19M5 11V8H8V14H5V11ZM17 11V8H14V14H17V11ZM8 11H14" stroke="var(--text-2)" strokeWidth="1.3" strokeLinecap="round" /></svg>, active: false },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: s.active ? 'rgba(242,196,0,0.12)' : 'var(--surface2)' }}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
