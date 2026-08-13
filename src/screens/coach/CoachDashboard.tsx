import { useEffect, useState } from 'react'
import { Card, SectionLabel, Avatar } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import {
  fetchGroupCompletionThisWeek, fetchClubActivityFeed, fetchClubKpis, fetchAthleteVigilance, fetchWeeklyFillStatus,
  type VigilanceAthlete, type WeeklyFillAthlete,
} from '../../lib/queries/coachStats'
import { ensureWeeklyClubChallenge } from '../../lib/queries/community'
import { sendMemberEmail } from '../../lib/queries/clubAdmin'
import { fetchOrCreateDm, sendMessage } from '../../lib/queries/messages'

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
  const { data: fillStatus } = useQuery(() => (clubId ? fetchWeeklyFillStatus(clubId) : Promise.resolve([])), [clubId])
  const pendingAthletes = (fillStatus ?? []).filter((a) => a.planned > 0 && a.done < a.planned)
  const [relancingId, setRelancingId] = useState<string | null>(null)
  const [relancedIds, setRelancedIds] = useState<Set<string>>(new Set())

  async function handleRelance(athlete: WeeklyFillAthlete) {
    if (!profile) return
    setRelancingId(athlete.id)
    try {
      const missing = athlete.planned - athlete.done
      const body = `${athlete.name.split(' ')[0]}, tu as ${missing} séance${missing > 1 ? 's' : ''} de la semaine encore à valider (${athlete.pendingTitles.slice(0, 3).join(', ')}). Pense à rentrer tes chronos !`
      await Promise.allSettled([
        ...(athlete.email ? [sendMemberEmail(athlete.email, 'Séances à valider cette semaine', body)] : []),
        fetchOrCreateDm(profile.club_id, profile.id, athlete.id).then((convoId) => sendMessage(convoId, profile.id, body)),
      ])
      setRelancedIds((prev) => new Set(prev).add(athlete.id))
    } finally {
      setRelancingId(null)
    }
  }

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

      {/* Weekly fill status */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>Séances de la semaine — qui a rempli</SectionLabel>
          {!!pendingAthletes.length && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(228,87,74,0.12)', color: '#E4574A' }}>
              {pendingAthletes.length} à relancer
            </span>
          )}
        </div>
        {!fillStatus?.length ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucun athlète pour l&apos;instant.</p>
        ) : !pendingAthletes.length ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Tout le monde a validé ses séances de la semaine.</p>
        ) : (
          <div className="space-y-0 mt-1">
            {pendingAthletes.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <Avatar initials={a.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                    {a.done}/{a.planned} validées{a.pendingTitles.length ? ` · ${a.pendingTitles.slice(0, 2).join(', ')}` : ''}
                  </p>
                </div>
                {relancedIds.has(a.id) ? (
                  <span className="text-xs font-semibold shrink-0" style={{ color: '#5EBA65' }}>Relancé ✓</span>
                ) : (
                  <button onClick={() => handleRelance(a)} disabled={relancingId === a.id}
                    className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0 disabled:opacity-50 transition-transform active:scale-95"
                    style={{ background: '#F2C400', color: '#0E0E0D' }}>
                    {relancingId === a.id ? '…' : 'Relancer'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

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
