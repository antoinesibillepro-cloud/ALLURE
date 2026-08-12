import { Card, SectionLabel, BtnSecondary } from '../../components/ui'

const GROUPS_DATA = [
  { name: 'Élite', attendance: 87, km: 62, sessions: 4.2 },
  { name: 'Confirmé', attendance: 71, km: 48, sessions: 3.6 },
  { name: 'Débutant', attendance: 58, km: 28, sessions: 2.9 },
]

const MONTHLY_ATTENDANCE = [65, 70, 74, 78, 80, 83, 87, 71]
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû']

function AttendanceChart() {
  const max = 100
  const H = 80
  return (
    <div className="flex items-end gap-2 mt-2" style={{ height: H + 20 }}>
      {MONTHLY_ATTENDANCE.map((v, i) => {
        const isCurrent = i === MONTHLY_ATTENDANCE.length - 1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="relative w-full" style={{ height: H }}>
              <div className="absolute bottom-0 w-full" style={{
                height: `${(v / max) * H}px`,
                background: isCurrent ? '#F2C400' : 'var(--surface3)',
                borderRadius: '6px 6px 0 0',
              }} />
              {isCurrent && (
                <span className="absolute left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#F2C400]"
                  style={{ bottom: (v / max) * H + 4 }}>{v}%</span>
              )}
            </div>
            <span className="text-[9px] uppercase" style={{ color: 'var(--text-2)' }}>{MONTHS[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

function GroupBarChart({ data }: { data: typeof GROUPS_DATA }) {
  return (
    <div className="space-y-3 mt-1">
      {data.map((g) => (
        <div key={g.name}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{g.name}</span>
            <span className="text-sm font-black" style={{ color: g.attendance >= 80 ? '#5EBA65' : g.attendance >= 65 ? '#F2C400' : '#E4574A' }}>
              {g.attendance}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${g.attendance}%`,
                background: g.attendance >= 80 ? '#5EBA65' : g.attendance >= 65 ? '#F2C400' : '#E4574A',
              }} />
          </div>
          <div className="flex gap-4 mt-1">
            <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>{g.km} km moy. · {g.sessions} séances/athlète</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CoachStats() {
  const clubAttendance = Math.round(GROUPS_DATA.reduce((s, g) => s + g.attendance, 0) / GROUPS_DATA.length)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Statistiques club</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Saison 2025–26 · Paris Athlétisme</p>
        </div>
        <div className="flex gap-2">
          <BtnSecondary className="text-xs !py-2 !px-3">Export PDF</BtnSecondary>
          <BtnSecondary className="text-xs !py-2 !px-3">Export CSV</BtnSecondary>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Assiduité globale', value: `${clubAttendance}`, unit: '%', color: '#5EBA65' },
          { label: 'Athlètes actifs', value: '34', unit: '', color: 'var(--text-1)' },
          { label: 'Séances publiées', value: '127', unit: '', color: '#F2C400' },
          { label: 'Séances complétées', value: '89', unit: '%', color: '#5B91D8' },
        ].map((kpi) => (
          <Card key={kpi.label} className="!p-4">
            <p className="text-[8px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>{kpi.label}</p>
            <p className="text-3xl font-black leading-none" style={{ color: kpi.color }}>
              {kpi.value}<span className="text-sm font-medium ml-0.5" style={{ color: 'var(--text-2)' }}>{kpi.unit}</span>
            </p>
          </Card>
        ))}
      </div>

      {/* Attendance over time */}
      <Card>
        <SectionLabel>Assiduité globale — 2026</SectionLabel>
        <AttendanceChart />
      </Card>

      {/* Group comparison */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>Comparatif par groupe</SectionLabel>
          <span className="text-[9px] mb-3" style={{ color: 'var(--text-2)' }}>semaine en cours</span>
        </div>
        <GroupBarChart data={GROUPS_DATA} />
      </Card>

      {/* Collective progression */}
      <Card>
        <SectionLabel>Progression collective — Km moyens par semaine</SectionLabel>
        <div className="space-y-4">
          {[
            { group: 'Groupe Élite', current: 62, target: 70, color: '#5EBA65' },
            { group: 'Groupe Confirmé', current: 48, target: 55, color: '#F2C400' },
            { group: 'Groupe Débutant', current: 28, target: 35, color: '#5B91D8' },
          ].map((row) => (
            <div key={row.group}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{row.group}</span>
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                  <span className="font-bold" style={{ color: 'var(--text-1)' }}>{row.current}</span> / {row.target} km
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <div className="h-full rounded-full" style={{ width: `${(row.current / row.target) * 100}%`, background: row.color }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top athletes this week */}
      <Card>
        <SectionLabel>Top athlètes — Semaine</SectionLabel>
        <div className="space-y-0">
          {[
            { name: 'Romain Simon', group: 'Élite', km: 74, rank: 1 },
            { name: 'Sophie Bernard', group: 'Élite', km: 71, rank: 2 },
            { name: 'Thomas Dupont', group: 'Élite', km: 67, rank: 3 },
            { name: 'Noé Lambert', group: 'Confirmé', km: 52, rank: 4 },
            { name: 'Clara Boyer', group: 'Confirmé', km: 45, rank: 5 },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-3"
              style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <span className="text-xl font-black w-8 text-center"
                style={{ color: a.rank <= 3 ? '#F2C400' : 'var(--text-2)' }}>
                {a.rank <= 3 ? ['🥇', '🥈', '🥉'][a.rank - 1] : a.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{a.group}</p>
              </div>
              <span className="text-xl font-black" style={{ color: 'var(--text-1)' }}>
                {a.km}<span className="text-sm font-medium ml-0.5" style={{ color: 'var(--text-2)' }}>km</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
