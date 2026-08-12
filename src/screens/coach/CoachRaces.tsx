import { useState } from 'react'
import { Card, SectionLabel } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchClubRaces, createClubRace, deleteClubRace, assignAthleteToRace, removeRaceAssignment, type ClubRace } from '../../lib/queries/clubRaces'
import { fetchClubAthletes } from '../../lib/queries/groups'

export default function CoachRaces() {
  const { profile } = useApp()
  const { data: races, refetch } = useQuery<ClubRace[]>(
    () => (profile ? fetchClubRaces(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: athletes } = useQuery(
    () => (profile ? fetchClubAthletes(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [assigningRaceId, setAssigningRaceId] = useState<string | null>(null)
  const [assignAthleteId, setAssignAthleteId] = useState('')
  const [assignDiscipline, setAssignDiscipline] = useState('')
  const [assignTarget, setAssignTarget] = useState('')

  async function handleCreate() {
    if (!profile || !title.trim() || !eventDate) return
    setBusy(true)
    try {
      await createClubRace(profile.club_id, profile.id, { title: title.trim(), event_date: eventDate, location: location.trim() || null })
      setTitle(''); setEventDate(''); setLocation(''); setShowCreate(false)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteClubRace(id)
    await refetch()
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
  const past = (races ?? []).filter((r) => new Date(r.event_date) < now)

  function RaceCard({ r }: { r: ClubRace }) {
    const daysLeft = Math.max(0, Math.ceil((new Date(r.event_date).getTime() - now.getTime()) / 86400000))
    return (
      <Card className="!p-0 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'rgba(242,196,0,0.12)' }}>
            <span className="text-sm font-black text-[#F2C400] leading-none">{daysLeft}</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-[#F2C400] mt-0.5">jours</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{r.title}</p>
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

        {assigningRaceId === r.id ? (
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
        )}
      </Card>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto pb-10">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Calendrier de courses</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{upcoming.length} course{upcoming.length > 1 ? 's' : ''} à venir</p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="text-xs font-bold px-4 py-2 rounded-xl" style={{ background: '#F2C400', color: '#0E0E0D' }}>
          + Ajouter
        </button>
      </div>

      {showCreate && (
        <Card>
          <SectionLabel>Nouvelle course</SectionLabel>
          <div className="space-y-2 mt-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Championnats régionaux"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                className="rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu"
                className="rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={busy || !title.trim() || !eventDate}
                className="text-xs font-bold px-4 py-2 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                {busy ? '…' : 'Créer'}
              </button>
              <button onClick={() => setShowCreate(false)} className="text-xs font-semibold px-4 py-2 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
            </div>
          </div>
        </Card>
      )}

      {!upcoming.length && !showCreate ? (
        <Card>
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucune course programmée.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcoming.map((r) => <RaceCard key={r.id} r={r} />)}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <SectionLabel>Passées</SectionLabel>
          <div className="space-y-3 mt-2 opacity-60">
            {past.map((r) => <RaceCard key={r.id} r={r} />)}
          </div>
        </div>
      )}
    </div>
  )
}
