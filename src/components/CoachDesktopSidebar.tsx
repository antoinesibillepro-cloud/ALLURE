import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchClubKpis } from '../lib/queries/coachStats'

/** Left-hand desktop sidebar for the coach dashboard — mirrors AthleteDesktopSidebar's profile card. */
export default function CoachDesktopSidebar() {
  const { profile } = useApp()
  const initials = (profile?.name ?? '').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  const { data: kpis } = useQuery(
    () => (profile ? fetchClubKpis(profile.club_id) : Promise.resolve(null)),
    [profile?.club_id],
  )

  return (
    <div className="space-y-3">
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        <div className="flex flex-col items-center px-5 pt-6 pb-5">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black overflow-hidden"
              style={{ background: '#F2C400', color: '#0E0E0D' }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#F2C400] flex items-center justify-center"
              style={{ border: '2px solid var(--card)' }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4.5 7.5L8.5 3" stroke="#0E0E0D" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <p className="text-[17px] font-black leading-tight text-center" style={{ color: 'var(--text-1)' }}>{profile?.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Coach</p>
          <div className="flex w-full mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Athlètes', value: `${kpis?.activeAthletes ?? 0}` },
              { label: 'Assiduité', value: `${kpis?.completionRate ?? 0}%` },
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
    </div>
  )
}
