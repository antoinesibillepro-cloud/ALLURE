import { useState } from 'react'
import { Card, SectionLabel } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import {
  fetchClubRaces, createClubRace, deleteClubRace, assignAthleteToRace, removeRaceAssignment,
  RACE_TYPE_LABEL, type ClubRace, type RaceType,
} from '../../lib/queries/clubRaces'
import { fetchClubAthletes } from '../../lib/queries/groups'
import { useToast } from '../../components/Toast'

const RACE_TYPE_COLOR: Record<RaceType, string> = {
  piste: '#5B91D8', route: '#F2C400', cross: '#A9683F', trail: '#5EBA65', stage: '#7B6FD6',
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

function MonthCalendar({ races, selectedDate, onSelectDate }: { races: ClubRace[]; selectedDate: string; onSelectDate: (iso: string) => void }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const base = new Date()
  const viewMonth = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1)
  const monthLabel = viewMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const startOffset = (viewMonth.getDay() + 6) % 7
  const cells: Array<number | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function dayIso(d: number) {
    return `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const racesByDay = new Map<string, ClubRace[]>()
  for (const r of races) {
    const key = r.event_date.slice(0, 10)
    racesByDay.set(key, [...(racesByDay.get(key) ?? []), r])
  }
  const todayIso = isoDate(base)

  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonthOffset((m) => m - 1)} className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90" style={{ background: 'var(--surface2)' }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-1)' }}>{monthLabel}</p>
        <button onClick={() => setMonthOffset((m) => m + 1)} className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90" style={{ background: 'var(--surface2)' }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['LU', 'MA', 'ME', 'JE', 'VE', 'SA', 'DI'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold tracking-widest py-0.5" style={{ color: 'var(--text-2)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />
          const di = dayIso(d)
          const dayRaces = racesByDay.get(di) ?? []
          const isSelected = di === selectedDate
          const isToday = di === todayIso
          return (
            <button key={d} onClick={() => onSelectDate(di)}
              className="relative flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all"
              style={{
                background: isSelected ? '#F2C400' : 'var(--surface2)',
                outline: isToday && !isSelected ? '1px solid rgba(242,196,0,0.4)' : 'none',
                transition: 'background 0.2s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
              <span className="text-xs font-bold" style={{ color: isSelected ? '#0E0E0D' : 'var(--text-1)' }}>{d}</span>
              <div className="flex gap-0.5 h-1.5 items-center">
                {dayRaces.slice(0, 3).map((r) => (
                  <span key={r.id} className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? '#0E0E0D' : RACE_TYPE_COLOR[r.race_type] }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export default function CoachRaces() {
  const { profile } = useApp()
  const toast = useToast()
  const { data: races, refetch } = useQuery<ClubRace[]>(
    () => (profile ? fetchClubRaces(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: athletes } = useQuery(
    () => (profile ? fetchClubAthletes(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )

  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()))
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [raceType, setRaceType] = useState<RaceType>('piste')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [assigningRaceId, setAssigningRaceId] = useState<string | null>(null)
  const [assignAthleteId, setAssignAthleteId] = useState('')
  const [assignDiscipline, setAssignDiscipline] = useState('')
  const [assignTarget, setAssignTarget] = useState('')

  async function handleCreate() {
    if (!profile || !title.trim() || !selectedDate) return
    setBusy(true)
    try {
      const label = title.trim()
      await createClubRace(profile.club_id, profile.id, { title: label, event_date: selectedDate, location: location.trim() || null, race_type: raceType })
      setTitle(''); setLocation(''); setRaceType('piste'); setShowCreate(false)
      await refetch()
      toast(`${label} ajouté au calendrier`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Création impossible', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteClubRace(id)
      await refetch()
      toast('Événement supprimé')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Suppression impossible', 'error')
    }
  }

  async function handleAssign(raceId: string) {
    if (!assignAthleteId || !assignDiscipline.trim()) return
    setBusy(true)
    try {
      await assignAthleteToRace(raceId, assignAthleteId, assignDiscipline.trim(), assignTarget.trim() || null)
      setAssignAthleteId(''); setAssignDiscipline(''); setAssignTarget(''); setAssigningRaceId(null)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveAssignment(id: string) {
    await removeRaceAssignment(id)
    await refetch()
  }

  const now = new Date()
  const upcoming = (races ?? []).filter((r) => new Date(r.event_date) >= now)
  const selectedDayRaces = (races ?? []).filter((r) => r.event_date.slice(0, 10) === selectedDate)

  function RaceRow({ r }: { r: ClubRace }) {
    const daysLeft = Math.max(0, Math.ceil((new Date(r.event_date).getTime() - now.getTime()) / 86400000))
    const color = RACE_TYPE_COLOR[r.race_type]
    return (
      <Card className="!p-0 overflow-hidden card-lift">
        <div className="flex items-start gap-3 p-4">
          <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: `${color}20` }}>
            <span className="text-sm font-black leading-none" style={{ color }}>{daysLeft}</span>
            <span className="text-[7px] font-bold uppercase tracking-wider mt-0.5" style={{ color }}>jours</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{r.title}</p>
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${color}20`, color }}>{RACE_TYPE_LABEL[r.race_type]}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
              {new Date(r.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {r.location ? ` · ${r.location}` : ''}
            </p>
          </div>
          <button onClick={() => handleDelete(r.id)} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ color: 'var(--text-2)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
        </div>

        {r.assignments.length > 0 && (
          <div className="px-4 pb-3 space-y-1.5">
            {r.assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1.5 px-3 rounded-xl" style={{ background: 'var(--surface2)' }}>
                <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--text-1)' }}>{a.profile?.name ?? '—'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: 'rgba(242,196,0,0.15)', color: '#F2C400' }}>{a.discipline}</span>
                {a.target_time && <span className="text-xs" style={{ color: 'var(--text-2)' }}>{a.target_time}</span>}
                <button onClick={() => handleRemoveAssignment(a.id)} className="text-xs" style={{ color: '#E4574A' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {r.race_type !== 'stage' && (assigningRaceId === r.id ? (
          <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <select value={assignAthleteId} onChange={(e) => setAssignAthleteId(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
              <option value="">Choisir un athlète</option>
              {(athletes ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input value={assignDiscipline} onChange={(e) => setAssignDiscipline(e.target.value)} placeholder="Discipline (ex: 1500m)"
                className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
              <input value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)} placeholder="Chrono cible"
                className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAssign(r.id)} disabled={busy || !assignAthleteId || !assignDiscipline.trim()}
                className="text-xs font-bold px-4 py-2 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                {busy ? '…' : 'Assigner'}
              </button>
              <button onClick={() => setAssigningRaceId(null)} className="text-xs font-semibold px-4 py-2 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAssigningRaceId(r.id)} className="w-full py-2.5 text-sm font-semibold text-[#F2C400] flex items-center justify-center gap-1.5"
            style={{ borderTop: '1px solid var(--border)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Assigner un athlète
          </button>
        ))}
      </Card>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto pb-10">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Calendrier de courses</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{upcoming.length} événement{upcoming.length > 1 ? 's' : ''} à venir</p>
        </div>
      </div>

      <MonthCalendar races={races ?? []} selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setShowCreate(false) }} />

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-1)' }}>
            {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <button onClick={() => setShowCreate((v) => !v)} className="text-xs font-bold px-3 py-1.5 rounded-xl transition-transform active:scale-95" style={{ background: '#F2C400', color: '#0E0E0D' }}>
            + Ajouter
          </button>
        </div>

        {showCreate && (
          <div className="mt-2 p-3 rounded-2xl space-y-2" style={{ background: 'var(--surface2)' }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Championnats régionaux"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: 'var(--text-2)' }}>Type</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(RACE_TYPE_LABEL) as RaceType[]).map((t) => (
                  <button key={t} onClick={() => setRaceType(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-semibold transition-all"
                    style={{
                      background: raceType === t ? `${RACE_TYPE_COLOR[t]}26` : 'var(--card)',
                      color: raceType === t ? RACE_TYPE_COLOR[t] : 'var(--text-2)',
                      border: raceType === t ? `1px solid ${RACE_TYPE_COLOR[t]}4d` : '1px solid transparent',
                    }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: RACE_TYPE_COLOR[t] }} />
                    {RACE_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={busy || !title.trim()}
                className="text-xs font-bold px-4 py-2 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                {busy ? '…' : 'Créer'}
              </button>
              <button onClick={() => setShowCreate(false)} className="text-xs font-semibold px-4 py-2 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
            </div>
          </div>
        )}

        {!showCreate && !selectedDayRaces.length && (
          <p className="text-sm py-3" style={{ color: 'var(--text-2)' }}>Rien ce jour-là.</p>
        )}
      </Card>

      {selectedDayRaces.length > 0 && (
        <div className="space-y-3">
          {selectedDayRaces.map((r) => <RaceRow key={r.id} r={r} />)}
        </div>
      )}

      <div>
        <SectionLabel>Tous les événements à venir</SectionLabel>
        {!upcoming.length ? (
          <Card className="mt-2"><p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucun événement programmé.</p></Card>
        ) : (
          <div className="space-y-2 mt-2">
            {upcoming.map((r) => {
              const color = RACE_TYPE_COLOR[r.race_type]
              return (
                <button key={r.id} onClick={() => setSelectedDate(r.event_date.slice(0, 10))}
                  className="w-full flex items-center gap-3 py-2.5 px-3 rounded-2xl text-left transition-colors"
                  style={{ background: r.event_date.slice(0, 10) === selectedDate ? 'var(--surface2)' : 'transparent' }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-2)' }}>{new Date(r.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--text-1)' }}>{r.title}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${color}20`, color }}>{RACE_TYPE_LABEL[r.race_type]}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
