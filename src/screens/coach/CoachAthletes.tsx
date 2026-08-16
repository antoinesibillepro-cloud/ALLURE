import { useState } from 'react'
import { Card, SectionLabel, Avatar } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchGroups, type GroupWithMembers } from '../../lib/queries/groups'
import { fetchLatestWellnessScores, fetchWellnessAverages, fetchAthleteTotalKm, fetchLastActivity, fetchAthleteWeekStats, type WellnessScore } from '../../lib/queries/stats'
import {
  fetchPersonalRecords, fetchInjuries, createPersonalRecord, updatePersonalRecord, deletePersonalRecord,
  type PersonalRecord, type Injury,
} from '../../lib/queries/profileExtras'
import { fetchDisciplineBreakdown, type DisciplineBreakdown } from '../../lib/queries/crossTraining'
import { fetchAthleteSessionHistory, type AthleteHistoryEntry } from '../../lib/queries/sessions'
import { fetchAvailability, WEEKDAY_LABELS, type DayAvailability } from '../../lib/queries/availability'
import { DonutChart } from '../../components/charts'
import { useToast } from '../../components/Toast'
import { SkeletonRows } from '../../components/Skeleton'

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

const SEVERITY_COLOR: Record<string, string> = { légère: '#3D9E4A', modérée: '#F2C400', grave: '#C94040' }

function paceLabel(km: number | null, min: number | null): string | null {
  if (!km || !min || km <= 0) return null
  const secPerKm = (min * 60) / km
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}'${s.toString().padStart(2, '0')}"/km`
}

function HistoryRow({ entry }: { entry: AthleteHistoryEntry }) {
  const [open, setOpen] = useState(false)
  const pace = paceLabel(entry.distance_km, entry.duration_min)
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface2)' }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        <div className="w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: 'var(--surface3)' }}>
          <span className="text-[11px] font-black leading-none" style={{ color: 'var(--text-1)' }}>
            {new Date(entry.completed_at).toLocaleDateString('fr-FR', { day: 'numeric' })}
          </span>
          <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--text-2)' }}>
            {new Date(entry.completed_at).toLocaleDateString('fr-FR', { month: 'short' })}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
            {entry.title}{entry.status === 'free_session' ? ' (libre)' : ''}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-2)' }}>
            {entry.distance_km ? `${entry.distance_km} km` : '—'}
            {entry.duration_min ? ` · ${entry.duration_min} min` : ''}
            {pace ? ` · ${pace}` : ''}
            {entry.rpe ? ` · RPE ${entry.rpe}` : ''}
          </p>
        </div>
        {entry.splits.length > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(91,145,216,0.15)', color: '#5B91D8' }}>
            {entry.splits.length} chronos
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M4.5 3L7.5 6L4.5 9" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (entry.note || entry.splits.length > 0) && (
        <div className="px-3 pb-3">
          {entry.note && <p className="text-xs mb-2" style={{ color: 'var(--text-2)' }}>{entry.note}</p>}
          {entry.splits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.splits.map((s) => (
                <span key={s.rep_number} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface3)', color: 'var(--text-1)' }}>
                  #{s.rep_number} {s.time_seconds}s{s.recovery_seconds ? <span style={{ color: 'var(--text-2)' }}> · récup {s.recovery_seconds}s</span> : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AthleteDetail({ profileId, name }: { profileId: string; name: string }) {
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)

  const { data: wellness } = useQuery(() => fetchWellnessAverages(profileId), [profileId])
  const { data: totalKm } = useQuery(() => fetchAthleteTotalKm(profileId), [profileId])
  const { data: lastActivity } = useQuery(() => fetchLastActivity(profileId), [profileId])
  const { data: weekStats } = useQuery(() => fetchAthleteWeekStats(profileId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10)), [profileId])
  const toast = useToast()
  const { data: records, refetch: refetchRecords } = useQuery<PersonalRecord[]>(() => fetchPersonalRecords(profileId), [profileId])
  const [newDiscipline, setNewDiscipline] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))

  async function handleAddRecord() {
    if (!newDiscipline.trim() || !newValue.trim()) return
    const label = newDiscipline.trim()
    try {
      await createPersonalRecord(profileId, label, newValue.trim(), newDate)
      setNewDiscipline(''); setNewValue('')
      refetchRecords()
      toast(`Record ${label} enregistré`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Enregistrement impossible', 'error')
    }
  }
  const { data: injuries } = useQuery<Injury[]>(() => fetchInjuries(profileId), [profileId])
  const { data: breakdown } = useQuery<DisciplineBreakdown[]>(() => fetchDisciplineBreakdown(profileId, monthAgo, now.toISOString()), [profileId])
  const { data: history, loading: historyLoading } = useQuery<AthleteHistoryEntry[]>(() => fetchAthleteSessionHistory(profileId, 30), [profileId])
  const { data: availability } = useQuery<DayAvailability[]>(() => fetchAvailability(profileId), [profileId])

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <Avatar initials={initialsOf(name)} size={48} />
          <div>
            <p className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{name}</p>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              {lastActivity ? `Dernière activité : ${lastActivity.title} · ${new Date(lastActivity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : 'Aucune activité récente'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <p className="text-xl font-black" style={{ color: 'var(--text-1)' }}>{Math.round(totalKm ?? 0)}<span className="text-xs font-semibold ml-1" style={{ color: 'var(--text-2)' }}>km</span></p>
            <p className="text-[9px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-2)' }}>total</p>
          </div>
          <div>
            <p className="text-xl font-black" style={{ color: 'var(--text-1)' }}>{weekStats?.sessionsDone ?? 0}/{weekStats?.sessionsPlanned ?? 0}</p>
            <p className="text-[9px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-2)' }}>séances/sem.</p>
          </div>
          <div>
            <p className="text-xl font-black" style={{ color: 'var(--text-1)' }}>{Math.round(weekStats?.kmDone ?? 0)}<span className="text-xs font-semibold ml-1" style={{ color: 'var(--text-2)' }}>km</span></p>
            <p className="text-[9px] uppercase tracking-wide font-bold" style={{ color: 'var(--text-2)' }}>cette semaine</p>
          </div>
        </div>
      </Card>

      {!!availability?.length && (
        <Card>
          <SectionLabel>Disponibilités</SectionLabel>
          <div className="grid grid-cols-7 gap-1 mt-2">
            {WEEKDAY_LABELS.map((label, weekday) => {
              const day = availability.find((a) => a.weekday === weekday)
              const matin = day?.matin ?? true
              const apresMidi = day?.apres_midi ?? true
              return (
                <div key={weekday} className="text-center">
                  <p className="text-[8px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-2)' }}>{label.slice(0, 3)}</p>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="text-[8px] font-bold py-1" style={{ background: matin ? 'rgba(242,196,0,0.15)' : 'var(--surface2)', color: matin ? '#F2C400' : 'var(--text-2)' }}>M</div>
                    <div className="text-[8px] font-bold py-1" style={{ background: apresMidi ? 'rgba(242,196,0,0.15)' : 'var(--surface2)', color: apresMidi ? '#F2C400' : 'var(--text-2)' }}>A</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <SectionLabel>Forme — moyenne 12 semaines</SectionLabel>
        {!wellness || wellness.count === 0 ? (
          <p className="text-sm py-3" style={{ color: 'var(--text-2)' }}>Pas encore de bilan de forme enregistré.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2 mt-2">
            {[
              { label: 'Sommeil', value: `${wellness.sleep.toFixed(1)}h` },
              { label: 'Motivation', value: `${wellness.motivation.toFixed(1)}/10` },
              { label: 'Fatigue', value: `${wellness.fatigue.toFixed(1)}/10` },
              { label: 'Stress', value: `${wellness.stress.toFixed(1)}/10` },
              { label: 'Courbat.', value: `${wellness.soreness.toFixed(1)}/10` },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-xl py-2" style={{ background: 'var(--surface2)' }}>
                <p className="text-sm font-black" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                <p className="text-[8px] uppercase tracking-wide font-bold mt-0.5" style={{ color: 'var(--text-2)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel>Répartition · 30 derniers jours</SectionLabel>
        <div className="mt-2">
          {!breakdown?.length ? (
            <p className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Aucune séance sur les 30 derniers jours.</p>
          ) : (
            <DonutChart segments={breakdown} />
          )}
        </div>
      </Card>

      <Card>
        <SectionLabel>Historique des séances</SectionLabel>
        {historyLoading ? (
          <SkeletonRows count={3} />
        ) : !history?.length ? (
          <p className="text-sm py-3" style={{ color: 'var(--text-2)' }}>Aucune séance réalisée pour l'instant.</p>
        ) : (
          <div className="space-y-1.5 mt-2">
            {history.map((h) => <HistoryRow key={h.id} entry={h} />)}
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel>Records personnels</SectionLabel>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-2)' }}>
          Saisis ici les chronos relevés sur la fiche Base Athlé FFA de l'athlète.
        </p>
        {!!records?.length && (
          <div className="space-y-1.5 mt-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <input defaultValue={r.discipline}
                  onBlur={(e) => e.target.value !== r.discipline && updatePersonalRecord(r.id, { discipline: e.target.value }).then(refetchRecords)}
                  className="flex-1 min-w-0 text-sm font-semibold bg-transparent outline-none"
                  style={{ color: 'var(--text-1)' }} />
                <input defaultValue={r.value}
                  onBlur={(e) => e.target.value !== r.value && updatePersonalRecord(r.id, { value: e.target.value }).then(refetchRecords)}
                  className="w-20 text-sm font-bold text-right bg-transparent outline-none"
                  style={{ color: r.is_season_best ? '#F2C400' : 'var(--text-1)' }} />
                <input type="date" defaultValue={r.date}
                  onBlur={(e) => e.target.value !== r.date && updatePersonalRecord(r.id, { date: e.target.value }).then(refetchRecords)}
                  className="w-[110px] text-xs text-right bg-transparent outline-none shrink-0"
                  style={{ color: 'var(--text-2)', colorScheme: 'dark' }} />
                <button onClick={() => deletePersonalRecord(r.id).then(refetchRecords)}
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ color: 'var(--text-2)' }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <input value={newDiscipline} onChange={(e) => setNewDiscipline(e.target.value)} placeholder="Discipline (ex: 100m)"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
          <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Chrono"
            className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
            className="w-[110px] px-2 py-2 rounded-xl text-xs outline-none shrink-0"
            style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)', colorScheme: 'dark' }} />
          <button onClick={handleAddRecord} disabled={!newDiscipline.trim() || !newValue.trim()}
            className="text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#F2C400', color: '#0E0E0D' }}>+</button>
        </div>
      </Card>

      <Card>
        <SectionLabel>Blessures</SectionLabel>
        {!injuries?.length ? (
          <p className="text-sm py-3" style={{ color: 'var(--text-2)' }}>Aucune blessure enregistrée.</p>
        ) : (
          <div className="space-y-1.5 mt-2">
            {injuries.map((inj) => (
              <div key={inj.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{inj.type}</span>
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>{new Date(inj.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}{inj.duration_text ? ` · ${inj.duration_text}` : ''}</p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${SEVERITY_COLOR[inj.severity]}22`, color: SEVERITY_COLOR[inj.severity] }}>{inj.severity}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function CoachAthletes() {
  const { profile } = useApp()
  const { data: groups } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: wellness } = useQuery<Record<string, WellnessScore>>(
    () => (profile ? fetchLatestWellnessScores(profile.club_id) : Promise.resolve({})),
    [profile?.club_id],
  )
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)

  const topGroups = (groups ?? []).filter((g) => !g.parent_group_id)

  if (selected) {
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto pb-10">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: 'var(--text-2)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Retour aux athlètes
        </button>
        <AthleteDetail profileId={selected.id} name={selected.name} />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto pb-10">
      <div className="pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Athlètes</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Répertoire par groupe</p>
      </div>

      {!topGroups.length ? (
        <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucun groupe pour l&apos;instant.</p></Card>
      ) : (
        topGroups.map((g) => {
          const subgroups = (groups ?? []).filter((sg) => sg.parent_group_id === g.id)
          const clusters = [{ label: g.name, members: g.members }, ...subgroups.map((sg) => ({ label: `${g.name} · ${sg.name}`, members: sg.members }))]
          return (
            <div key={g.id} className="space-y-2">
              {clusters.filter((c) => c.members.length > 0).map((cluster) => (
                <Card key={cluster.label}>
                  <SectionLabel>{cluster.label}</SectionLabel>
                  <div className="mt-2 space-y-1">
                    {cluster.members.map((m) => {
                      const score = wellness?.[m.id]
                      const color = !score ? 'var(--text-2)' : score.pct >= 70 ? '#5EBA65' : score.pct >= 40 ? '#F2C400' : '#E4574A'
                      return (
                        <button key={m.id} onClick={() => setSelected({ id: m.id, name: m.name })}
                          className="w-full flex items-center gap-3 py-2.5 text-left transition-colors">
                          <Avatar initials={initialsOf(m.name)} size={36} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{m.name}</p>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: score ? `${color}22` : 'var(--surface2)', color }}>
                            {score ? `Forme ${score.pct}%` : 'Pas de bilan'}
                          </span>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
