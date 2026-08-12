import { useEffect } from 'react'
import { Card, SectionLabel, Avatar } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchGroupCompletionThisWeek, fetchClubActivityFeed, fetchClubKpis, fetchAthleteVigilance, type VigilanceAthlete } from '../../lib/queries/coachStats'
import { ensureWeeklyClubChallenge } from '../../lib/queries/community'

const STATUS_LABEL: Record<VigilanceAthlete['status'], string> = { alerte: 'Alerte', attention: 'À surveiller', ok: 'En forme' }
const STATUS_COLOR: Record<VigilanceAthlete['status'], string> = { alerte: '#E4574A', attention: '#F2C400', ok: '#5EBA65' }

export default function CoachDashboard() {
  const { profile } = useApp()
  const clubId = profile?.club_id ?? ''

  const { data: kpis } = useQuery(() => (clubId ? fetchClubKpis(clubId) : Promise.resolve(null)), [clubId])
  const { data: groups } = useQuery(() => (clubId ? fetchGroupCompletionThisWeek(clubId) : Promise.resolve([])), [clubId])
  const { data: feed } = useQuery(() => (clubId ? fetchClubActivityFeed(clubId) : Promise.resolve([])), [clubId])
  const { data: vigilance } = useQuery(() => (clubId ? fetchAthleteVigilance(clubId) : Promise.resolve([])), [clubId])
  const toWatch = (vigilance ?? []).filter((v) => v.status !== 'ok')

  useEffect(() => {
    if (clubId && profile) ensureWeeklyClubChallenge(clubId, profile.id).catch(() => {})
  }, [clubId, profile?.id])

  const today = new Date()

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-sm capitalize" style={{ color: 'var(--text-2)' }}>
            {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Bonjour, {profile?.name?.split(' ')[0] ?? ''}</h1>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Athlètes actifs', value: kpis?.activeAthletes ?? 0, unit: '', color: 'var(--text-1)' },
          { label: 'Assiduité semaine', value: kpis?.completionRate ?? 0, unit: '%', color: '#5EBA65' },
          { label: 'Séances publiées', value: kpis?.sessionsPublished ?? 0, unit: '', color: '#F2C400' },
        ].map((kpi) => (
          <Card key={kpi.label} className="!p-4 text-center">
            <p className="text-3xl font-black leading-none" style={{ color: kpi.color }}>
              {kpi.value}<span className="text-base font-medium" style={{ color: 'var(--text-2)' }}>{kpi.unit}</span>
            </p>
            <p className="text-[9px] uppercase tracking-widest mt-2" style={{ color: 'var(--text-2)' }}>{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* Group cards */}
      <SectionLabel>Groupes</SectionLabel>
      {!groups?.length ? (
        <Card><p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucun groupe pour l'instant.</p></Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const pct = g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0
            return (
              <Card key={g.id} className="!p-0 overflow-hidden">
                <div className="flex">
                  <div className="w-1 shrink-0" style={{ background: '#5EBA65' }} />
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-base" style={{ color: 'var(--text-1)' }}>{g.name}</h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{g.memberCount} athlète{g.memberCount > 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-2xl font-black" style={{ color: '#5EBA65' }}>{pct}%</span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#F2C400' }} />
                    </div>
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-2)' }}>
                      {g.total > 0 ? `${g.completed}/${g.total} séances complétées cette semaine` : 'Aucune séance publiée cette semaine'}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Vigilance */}
      <Card>
        <SectionLabel>À surveiller</SectionLabel>
        {!toWatch.length ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Tout le monde est en forme, aucune alerte.</p>
        ) : (
          <div className="space-y-0 mt-1">
            {toWatch.map((v) => (
              <div key={v.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <Avatar initials={v.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{v.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                    {v.groupName}
                    {v.completionRate !== null ? ` · Assiduité ${v.completionRate}%` : ''}
                    {v.formePct !== null ? ` · Forme ${v.formePct}%` : ' · Pas de bilan'}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0" style={{ background: `${STATUS_COLOR[v.status]}22`, color: STATUS_COLOR[v.status] }}>
                  {STATUS_LABEL[v.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Activity feed */}
      <Card>
        <SectionLabel>Activité récente du club</SectionLabel>
        {!feed?.length ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucune activité pour l'instant.</p>
        ) : (
          <div className="space-y-0">
            {feed.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <Avatar initials={item.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                    <span className="font-semibold">{item.name}</span>{' '}
                    <span style={{ color: 'var(--text-2)' }}>{item.action}</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{item.detail}</p>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--text-2)' }}>{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
