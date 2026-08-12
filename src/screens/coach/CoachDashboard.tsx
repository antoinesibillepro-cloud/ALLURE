import { Card, SectionLabel, BtnPrimary, Avatar } from '../../components/ui'

const GROUPS = [
  { name: 'Groupe Élite', athletes: 8, completed: 7, total: 8, alert: false, topAthlete: 'T. Dupont' },
  { name: 'Groupe Confirmé', athletes: 14, completed: 10, total: 14, alert: false, topAthlete: 'S. Bernard' },
  { name: 'Groupe Débutant', athletes: 12, completed: 7, total: 12, alert: true, alertMsg: '2 athlètes — surcharge détectée', topAthlete: 'A. Martin' },
]

const ACTIVITY_FEED = [
  { who: 'TD', name: 'Thomas Dupont', action: 'a complété sa séance', detail: 'Fractionné 10×400m', time: '10h24', emoji: '✅' },
  { who: 'SB', name: 'Sophie Bernard', action: 'a envoyé un message', detail: 'Groupe Élite', time: '09h45', emoji: '💬' },
  { who: 'AM', name: 'Alex Martin', action: 'a signalé une fatigue élevée', detail: 'Bilan form = 3/10', time: '08h30', emoji: '⚠️' },
  { who: 'LR', name: 'Lucas Renard', action: 'a complété sa séance', detail: 'Endurance fondamentale', time: '07h50', emoji: '✅' },
  { who: 'EP', name: 'Emma Petit', action: "n'a pas effectué sa séance", detail: 'Seuil lactique', time: 'Hier', emoji: '❌' },
]

// Athletes at overload risk — ACWR-based detection
const AT_RISK = [
  { initials: 'LG', name: 'Léa Girard', group: 'Élite', acwr: 1.42, reason: 'Charge +40% vs sem. précédente', fatigue: 8, sleep: 5 },
  { initials: 'AM', name: 'Alex Martin', group: 'Confirmé', acwr: 1.38, reason: 'Fatigue élevée + sommeil insuffisant', fatigue: 9, sleep: 4 },
  { initials: 'MB', name: 'Marine Blanc', group: 'Débutant', acwr: 1.51, reason: 'Surcharge aiguë détectée', fatigue: 7, sleep: 6 },
]

// Collective under-recovery: check if multiple athletes show high fatigue
const HIGH_FATIGUE_COUNT = 4
const GROUP_FATIGUE_ALERT = HIGH_FATIGUE_COUNT >= 3

export default function CoachDashboard() {
  const totalAthletes = GROUPS.reduce((s, g) => s + g.athletes, 0)
  const totalCompleted = GROUPS.reduce((s, g) => s + g.completed, 0)
  const totalSessions = GROUPS.reduce((s, g) => s + g.total, 0)
  const rate = Math.round((totalCompleted / totalSessions) * 100)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Dimanche 10 août 2026</p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Bonjour, Marc</h1>
        </div>
        <div className="flex gap-2">
          <button className="text-xs font-bold px-3 py-2 rounded-[12px] flex items-center gap-1.5"
            style={{ background: 'var(--card)', color: 'var(--text-1)', boxShadow: 'var(--card-shadow)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Annonce
          </button>
          <BtnPrimary className="text-xs !py-2 !px-3">+ Séance</BtnPrimary>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Athlètes actifs', value: totalAthletes, unit: '', color: 'var(--text-1)' },
          { label: 'Assiduité semaine', value: rate, unit: '%', color: '#5EBA65' },
          { label: 'Alertes charge', value: AT_RISK.length, unit: '', color: '#E4574A' },
        ].map((kpi) => (
          <Card key={kpi.label} className="!p-4 text-center">
            <p className="text-3xl font-black leading-none" style={{ color: kpi.color }}>
              {kpi.value}<span className="text-base font-medium" style={{ color: 'var(--text-2)' }}>{kpi.unit}</span>
            </p>
            <p className="text-[9px] uppercase tracking-widest mt-2" style={{ color: 'var(--text-2)' }}>{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* Overload / injury risk alerts */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Athlètes à risque — ACWR</SectionLabel>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(201,64,64,0.12)', color: '#C94040' }}>
            {AT_RISK.length} alertes
          </span>
        </div>

        {/* Collective fatigue banner */}
        {GROUP_FATIGUE_ALERT && (
          <div className="mb-3 p-3 rounded-xl flex items-start gap-3"
            style={{ background: 'rgba(242,196,0,0.08)', border: '1px solid rgba(242,196,0,0.2)' }}>
            <span className="text-base shrink-0">⚡</span>
            <div>
              <p className="text-xs font-bold" style={{ color: '#F2C400' }}>Sous-récupération collective</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                {HIGH_FATIGUE_COUNT} athlètes montrent une fatigue élevée simultanément.
                Envisagez d&apos;alléger la séance de demain.
              </p>
              <button className="mt-2 text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(242,196,0,0.15)', color: '#F2C400' }}>
                Adapter la séance
              </button>
            </div>
          </div>
        )}

        <div className="space-y-0">
          {AT_RISK.map((a, i) => {
            const acwrColor = a.acwr >= 1.5 ? '#C94040' : '#F2C400'
            return (
              <div key={i} className="flex items-start gap-3 py-3"
                style={{ borderBottom: i < AT_RISK.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <Avatar initials={a.initials} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                      {a.group}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{a.reason}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>
                      Fatigue <span className="font-bold" style={{ color: a.fatigue >= 7 ? '#C94040' : 'var(--text-1)' }}>{a.fatigue}/10</span>
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>
                      Sommeil <span className="font-bold" style={{ color: a.sleep <= 5 ? '#C94040' : 'var(--text-1)' }}>{a.sleep}h</span>
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-black" style={{ color: acwrColor }}>{a.acwr.toFixed(2)}</p>
                  <p className="text-[9px]" style={{ color: 'var(--text-2)' }}>ACWR</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Group cards */}
      <SectionLabel>Groupes</SectionLabel>
      <div className="space-y-3">
        {GROUPS.map((g) => {
          const pct = Math.round((g.completed / g.total) * 100)
          return (
            <Card key={g.name} className="!p-0 overflow-hidden">
              <div className="flex">
                <div className="w-1 shrink-0" style={{ background: g.alert ? '#E4574A' : '#5EBA65' }} />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base" style={{ color: 'var(--text-1)' }}>{g.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{g.athletes} athlètes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {g.alert && (
                        <span className="text-[9px] font-bold px-2.5 py-1 rounded-full text-[#E4574A] uppercase tracking-wider"
                          style={{ background: 'rgba(228,87,74,0.12)' }}>⚠️ Alerte</span>
                      )}
                      <span className="text-2xl font-black" style={{ color: g.alert ? '#E4574A' : '#5EBA65' }}>{pct}%</span>
                    </div>
                  </div>
                  {g.alert && (
                    <p className="text-xs mt-1 text-[#E4574A]">{g.alertMsg}</p>
                  )}
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: g.alert ? '#E4574A' : '#F2C400' }} />
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-2)' }}>{g.completed}/{g.total} séances complétées</p>
                  <div className="flex gap-2 mt-3">
                    <button className="text-xs font-semibold px-3 py-1.5 rounded-[12px] transition-colors"
                      style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                      Voir le groupe
                    </button>
                    <button className="text-xs font-semibold px-3 py-1.5 rounded-[12px] transition-colors"
                      style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                      Créer une séance
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Activity feed */}
      <Card>
        <SectionLabel>Activité récente du club</SectionLabel>
        <div className="space-y-0">
          {ACTIVITY_FEED.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-3"
              style={{ borderBottom: i < ACTIVITY_FEED.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <Avatar initials={item.who} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                  <span className="font-semibold">{item.name}</span>{' '}
                  <span style={{ color: 'var(--text-2)' }}>{item.action}</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{item.detail}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>{item.time}</span>
                <span className="text-base">{item.emoji}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
