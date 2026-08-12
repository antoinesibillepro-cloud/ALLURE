import { Card, SectionLabel, BtnSecondary } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchClubKpis, fetchGroupCompletionThisWeek, fetchTopAthletesThisWeek } from '../../lib/queries/coachStats'

function GroupBarChart({ data }: { data: { id: string; name: string; completed: number; total: number }[] }) {
  return (
    <div className="space-y-3 mt-1">
      {data.map((g) => {
        const pct = g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0
        const color = pct >= 80 ? '#5EBA65' : pct >= 65 ? '#F2C400' : '#E4574A'
        return (
          <div key={g.id}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{g.name}</span>
              <span className="text-sm font-black" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-2)' }}>{g.completed}/{g.total} séances complétées cette semaine</p>
          </div>
        )
      })}
    </div>
  )
}

export default function CoachStats() {
  const { profile } = useApp()
  const clubId = profile?.club_id ?? ''

  const { data: kpis } = useQuery(() => (clubId ? fetchClubKpis(clubId) : Promise.resolve(null)), [clubId])
  const { data: groups } = useQuery(() => (clubId ? fetchGroupCompletionThisWeek(clubId) : Promise.resolve([])), [clubId])
  const { data: topAthletes } = useQuery(() => (clubId ? fetchTopAthletesThisWeek(clubId) : Promise.resolve([])), [clubId])

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Statistiques club</h1>
        </div>
        <div className="flex gap-2">
          <BtnSecondary className="text-xs !py-2 !px-3 opacity-40 pointer-events-none">Export PDF</BtnSecondary>
          <BtnSecondary className="text-xs !py-2 !px-3 opacity-40 pointer-events-none">Export CSV</BtnSecondary>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Athlètes actifs', value: `${kpis?.activeAthletes ?? 0}`, unit: '', color: 'var(--text-1)' },
          { label: 'Séances publiées (sem.)', value: `${kpis?.sessionsPublished ?? 0}`, unit: '', color: '#F2C400' },
          { label: 'Assiduité (sem.)', value: `${kpis?.completionRate ?? 0}`, unit: '%', color: '#5EBA65' },
        ].map((kpi) => (
          <Card key={kpi.label} className="!p-4">
            <p className="text-[8px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>{kpi.label}</p>
            <p className="text-3xl font-black leading-none" style={{ color: kpi.color }}>
              {kpi.value}<span className="text-sm font-medium ml-0.5" style={{ color: 'var(--text-2)' }}>{kpi.unit}</span>
            </p>
          </Card>
        ))}
      </div>

      {/* Group comparison */}
      <Card>
        <SectionLabel>Comparatif par groupe — semaine en cours</SectionLabel>
        {!groups?.length ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucun groupe pour l'instant.</p>
        ) : (
          <GroupBarChart data={groups} />
        )}
      </Card>

      {/* Top athletes this week */}
      <Card>
        <SectionLabel>Top athlètes — Semaine</SectionLabel>
        {!topAthletes?.length ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucune activité enregistrée cette semaine.</p>
        ) : (
          <div className="space-y-0">
            {topAthletes.map((a, i) => (
              <div key={a.name + i} className="flex items-center gap-3 py-3"
                style={{ borderBottom: i < topAthletes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span className="text-xl font-black w-8 text-center" style={{ color: i < 3 ? '#F2C400' : 'var(--text-2)' }}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>{a.groupName}</p>
                </div>
                <span className="text-xl font-black" style={{ color: 'var(--text-1)' }}>
                  {a.km.toFixed(1)}<span className="text-sm font-medium ml-0.5" style={{ color: 'var(--text-2)' }}>km</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
