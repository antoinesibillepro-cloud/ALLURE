import { useState } from 'react'
import { Card, SectionLabel, BtnPrimary, BtnSecondary } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchGroups, type GroupWithMembers } from '../../lib/queries/groups'
import {
  createSession, fetchCoachSessions, updateSession, deleteSession, fetchSessionRealizations,
  type AthleteRealization,
} from '../../lib/queries/sessions'

const SESSION_TYPES = [
  'Footing récup', 'Endurance fondamentale', 'VMA courte', 'VMA moyenne', 'VMA longue',
  'Fractionné', 'Seuil', 'Côtes courtes', 'Côtes longues', 'Sortie longue', 'Compétition',
]

function paceFromDistanceDuration(distanceKm: number | null, durationMin: number | null): string | null {
  if (!distanceKm || !durationMin || distanceKm <= 0) return null
  const secPerKm = (durationMin * 60) / distanceKm
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}'${s.toString().padStart(2, '0')}"/km`
}

type CoachSessionRow = {
  id: string; title: string; type: string; description: string | null
  duration_min: number | null; distance_km: number | null; vma_percent: number | null
  scheduled_at: string; status: string
  session_assignments: { group_id: string; groups: { name: string } | null }[]
}

function SessionLibraryRow({ session, onChanged }: { session: CoachSessionRow; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(session.title)
  const [description, setDescription] = useState(session.description ?? '')
  const [duration, setDuration] = useState(session.duration_min ?? 0)
  const [distance, setDistance] = useState(session.distance_km ?? 0)
  const [vmaPercent, setVmaPercent] = useState(session.vma_percent ?? 0)
  const [scheduledDate, setScheduledDate] = useState(session.scheduled_at.slice(0, 10))
  const [saving, setSaving] = useState(false)

  const groupIds = session.session_assignments.map((a) => a.group_id)
  const groupNames = session.session_assignments.map((a) => a.groups?.name).filter(Boolean).join(', ')

  const { data: realizations } = useQuery<AthleteRealization[]>(
    () => (expanded ? fetchSessionRealizations(session.id, groupIds) : Promise.resolve([])),
    [expanded, session.id],
  )

  async function handleSave() {
    setSaving(true)
    try {
      await updateSession(session.id, {
        title, description, duration_min: duration, distance_km: distance, vma_percent: vmaPercent,
        scheduled_at: new Date(scheduledDate).toISOString(),
      })
      setEditing(false)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer cette séance ?')) return
    await deleteSession(session.id)
    onChanged()
  }

  const daysDone = (realizations ?? []).filter((r) => r.status === 'done').length

  return (
    <Card className="!p-0 overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'rgba(242,196,0,0.12)' }}>
          <span className="text-xs font-black text-[#F2C400]">{new Date(session.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric' })}</span>
          <span className="text-[8px] font-bold uppercase text-[#F2C400]">{new Date(session.scheduled_at).toLocaleDateString('fr-FR', { month: 'short' })}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-1)' }}>{session.title}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{groupNames || 'Aucun groupe'} · {session.status === 'published' ? 'Publiée' : 'Brouillon'}</p>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M4.5 3L7.5 6L4.5 9" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          {!editing ? (
            <div className="pt-4">
              {session.description && <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>{session.description}</p>}
              <div className="flex gap-4 mb-3">
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>{session.duration_min ?? '—'} min</span>
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>{session.distance_km ?? '—'} km</span>
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>{session.vma_percent ?? '—'}% VMA</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                  Modifier / décaler
                </button>
                <button onClick={handleDelete} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#E4574A' }}>
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 space-y-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre"
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Contenu"
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none resize-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                <div />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="Durée (min)"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                <input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} placeholder="Distance (km)"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                <input type="number" value={vmaPercent} onChange={(e) => setVmaPercent(Number(e.target.value))} placeholder="%VMA"
                  className="rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving} className="text-xs font-bold px-4 py-2 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                  {saving ? '…' : 'Enregistrer'}
                </button>
                <button onClick={() => setEditing(false)} className="text-xs font-semibold px-4 py-2 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
              </div>
            </div>
          )}

          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2 mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Réalisations</p>
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{daysDone}/{realizations?.length ?? 0} fait{daysDone > 1 ? 'es' : 'e'}</span>
            </div>
            {!realizations?.length ? (
              <p className="text-xs py-2" style={{ color: 'var(--text-2)' }}>Aucun athlète dans les groupes assignés.</p>
            ) : (
              <div className="space-y-1.5">
                {realizations.map((r) => (
                  <div key={r.profile_id} className="rounded-xl px-3 py-2" style={{ background: 'var(--surface2)' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.status === 'done' ? '#5EBA65' : 'var(--border)' }} />
                      <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--text-1)' }}>{r.name}</span>
                      {r.status === 'done' && (
                        <span className="text-xs font-bold" style={{ color: '#F2C400' }}>
                          {paceFromDistanceDuration(r.actual_distance_km, r.actual_duration_min) ?? (r.rpe ? `RPE ${r.rpe}` : '')}
                        </span>
                      )}
                    </div>
                    {r.status === 'done' && (r.actual_distance_km || r.actual_duration_min) && (
                      <p className="text-xs mt-1 ml-3.5" style={{ color: 'var(--text-2)' }}>
                        {r.actual_distance_km ? `${r.actual_distance_km} km` : ''}{r.actual_duration_min ? ` · ${r.actual_duration_min} min` : ''}{r.rpe ? ` · RPE ${r.rpe}` : ''}
                      </p>
                    )}
                    {r.splits.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 ml-3.5">
                        {r.splits.map((s) => (
                          <span key={s.rep_number} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface3)', color: 'var(--text-1)' }}>
                            #{s.rep_number} {s.time_seconds}s
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function CoachSessions() {
  const { profile } = useApp()
  const [tab, setTab] = useState<'create' | 'library'>('create')
  const [sessionType, setSessionType] = useState('Endurance fondamentale')
  const [duration, setDuration] = useState(55)
  const [distance, setDistance] = useState(12)
  const [vmaPercent, setVmaPercent] = useState(88)
  const [description, setDescription] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10))
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishedOk, setPublishedOk] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedOk, setGeneratedOk] = useState(false)

  const { data: groups, loading: groupsLoading } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )

  const activeGroup = groups?.find((g) => g.id === selectedGroupId) ?? groups?.[0] ?? null
  const effectiveGroupId = selectedGroupId || activeGroup?.id || ''

  const { data: coachSessions, refetch: refetchCoachSessions } = useQuery<CoachSessionRow[]>(
    () => (profile && tab === 'library' ? (fetchCoachSessions(profile.club_id) as unknown as Promise<CoachSessionRow[]>) : Promise.resolve([])),
    [profile?.club_id, tab],
  )

  async function handlePublish(status: 'draft' | 'published') {
    if (!profile || !effectiveGroupId) return
    setPublishing(true)
    setPublishError(null)
    setPublishedOk(false)
    try {
      await createSession(profile.club_id, profile.id, {
        title: sessionType,
        type: sessionType,
        description,
        duration_min: duration,
        distance_km: distance,
        vma_percent: vmaPercent,
        scheduled_at: new Date(scheduledDate).toISOString(),
        group_ids: [effectiveGroupId],
        status,
      })
      setPublishedOk(true)
      setDescription('')
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Erreur lors de la publication')
    } finally {
      setPublishing(false)
    }
  }

  async function handleGenerateExamples() {
    if (!profile || !effectiveGroupId) return
    setGenerating(true)
    setGeneratedOk(false)
    try {
      const examples: Array<{ title: string; description: string; duration_min: number; distance_km: number; vma_percent: number; dayOffset: number }> = [
        { title: 'Endurance fondamentale', description: 'Footing facile, allure conversation.', duration_min: 45, distance_km: 8, vma_percent: 65, dayOffset: 0 },
        { title: 'Fractionné VMA', description: '10×400m à 95% VMA, R=1\'30 trot.', duration_min: 50, distance_km: 10, vma_percent: 95, dayOffset: 2 },
        { title: 'Seuil lactique', description: '3×2000m à 85% VMA, R=3\' trot.', duration_min: 55, distance_km: 11, vma_percent: 85, dayOffset: 4 },
        { title: 'Sortie longue', description: 'Sortie longue à allure endurance, dernier tiers un peu plus soutenu.', duration_min: 75, distance_km: 15, vma_percent: 70, dayOffset: 6 },
      ]
      for (const ex of examples) {
        const date = new Date()
        date.setDate(date.getDate() + ex.dayOffset)
        await createSession(profile.club_id, profile.id, {
          title: ex.title, type: ex.title, description: ex.description,
          duration_min: ex.duration_min, distance_km: ex.distance_km, vma_percent: ex.vma_percent,
          scheduled_at: date.toISOString(), group_ids: [effectiveGroupId], status: 'published',
        })
      }
      setGeneratedOk(true)
      setTimeout(() => setGeneratedOk(false), 3000)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto md:max-w-3xl">
      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Séances</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleGenerateExamples} disabled={generating || !effectiveGroupId}
            className="text-xs font-bold px-3 py-2 rounded-[12px] disabled:opacity-50"
            style={{ background: generatedOk ? 'rgba(94,186,101,0.15)' : 'var(--surface2)', color: generatedOk ? '#5EBA65' : 'var(--text-1)' }}>
            {generating ? 'Génération…' : generatedOk ? 'Séances générées' : 'Générer des séances d\'exemple'}
          </button>
          <div className="flex gap-1 p-1 rounded-[12px]" style={{ background: 'var(--card)', boxShadow: 'var(--card-shadow)' }}>
            {(['create', 'library'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all capitalize"
                style={{ background: tab === t ? '#F2C400' : 'transparent', color: tab === t ? '#0E0E0D' : 'var(--text-2)' }}>
                {t === 'create' ? 'Créer' : 'Bibliothèque'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'create' && (
        <>
          {/* Session editor */}
          <Card>
            <SectionLabel>Nouvelle séance</SectionLabel>

            {/* Type selector */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Type</label>
              <div className="flex flex-wrap gap-2">
                {SESSION_TYPES.map((t) => (
                  <button key={t} onClick={() => setSessionType(t)}
                    className="px-3 py-1.5 rounded-[12px] text-xs font-semibold transition-all"
                    style={{
                      background: sessionType === t ? 'rgba(242,196,0,0.15)' : 'var(--surface2)',
                      color: sessionType === t ? '#F2C400' : 'var(--text-2)',
                      border: sessionType === t ? '1px solid rgba(242,196,0,0.3)' : '1px solid transparent',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Numeric fields */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Durée', value: duration, set: setDuration, unit: 'min', min: 10, max: 180, step: 5 },
                { label: 'Distance', value: distance, set: setDistance, unit: 'km', min: 1, max: 40, step: 1 },
                { label: '%VMA', value: vmaPercent, set: setVmaPercent, unit: '%', min: 60, max: 105, step: 1 },
              ].map(({ label, value, set, unit, min, max, step }) => (
                <div key={label} className="rounded-[12px] p-3" style={{ background: 'var(--surface2)' }}>
                  <p className="text-[8px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-2)' }}>{label}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => set(Math.max(min, value - step))}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--surface3)', color: 'var(--text-2)' }}>−</button>
                    <span className="flex-1 text-center text-xl font-black" style={{ color: 'var(--text-1)' }}>{value}</span>
                    <button onClick={() => set(Math.min(max, value + step))}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--surface3)', color: 'var(--text-2)' }}>+</button>
                  </div>
                  <p className="text-[9px] text-center mt-1" style={{ color: 'var(--text-2)' }}>{unit}</p>
                </div>
              ))}
            </div>

            {/* Content textarea */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Contenu détaillé</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Éch. 15 min · 10 × 400m récup 90s · RAC 10 min..."
                className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
            </div>

            {/* Group + date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Groupe destinataire</label>
                <select value={effectiveGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}
                  disabled={groupsLoading || !groups?.length}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none appearance-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                  {!groups?.length && <option value="">Aucun groupe — crée-en un d'abord</option>}
                  {groups?.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.members.length})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Date de publication</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              </div>
            </div>
          </Card>

          {/* %VMA auto-calculator — using the real VMA of each athlete in the selected group */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Allures calculées — {vmaPercent}% VMA</SectionLabel>
              <span className="text-[10px] px-2 py-1 rounded-full text-[#F2C400]"
                style={{ background: 'rgba(242,196,0,0.12)' }}>{activeGroup?.name ?? '—'}</span>
            </div>
            {!activeGroup?.members.length ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-2)' }}>
                Aucun athlète avec une VMA renseignée dans ce groupe pour l'instant.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs min-w-[320px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Athlète', 'VMA', 'Allure 400m', 'Allure km'].map((h, i) => (
                        <th key={h} className={`pb-2 font-medium text-[10px] uppercase tracking-wider ${i === 0 ? 'text-left pr-3' : 'text-center px-2'}`}
                          style={{ color: 'var(--text-2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.members.filter((m) => m.vma).map((row) => {
                      const vma = row.vma!
                      const pace400 = Math.round((400 / (vma * vmaPercent / 100 / 3.6)))
                      const min400 = Math.floor(pace400 / 60)
                      const sec400 = pace400 % 60
                      const paceKm = Math.round((1000 / (vma * vmaPercent / 100 / 3.6)))
                      const minKm = Math.floor(paceKm / 60)
                      const secKm = paceKm % 60
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="py-2.5 pr-3 font-semibold" style={{ color: 'var(--text-1)' }}>{row.name}</td>
                          <td className="py-2.5 px-2 text-center" style={{ color: 'var(--text-2)' }}>{vma}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-[#F2C400]">{min400}'{String(sec400).padStart(2,'0')}"</td>
                          <td className="py-2.5 px-2 text-center font-bold" style={{ color: 'var(--text-1)' }}>{minKm}'{String(secKm).padStart(2,'0')}"/km</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {publishError && (
            <p className="text-xs rounded-[10px] px-3 py-2" style={{ background: 'rgba(228,87,74,0.12)', color: '#E4574A' }}>{publishError}</p>
          )}
          {publishedOk && (
            <p className="text-xs rounded-[10px] px-3 py-2" style={{ background: 'rgba(94,186,101,0.12)', color: '#5EBA65' }}>Séance enregistrée.</p>
          )}

          <div className="flex gap-3">
            <BtnPrimary className="flex-1" disabled={publishing || !effectiveGroupId} onClick={() => handlePublish('published')}>
              {publishing ? 'Publication…' : 'Publier la séance'}
            </BtnPrimary>
            <BtnSecondary onClick={() => handlePublish('draft')}>Sauvegarder en brouillon</BtnSecondary>
          </div>
        </>
      )}

      {tab === 'library' && (
        <div className="space-y-3">
          {!coachSessions?.length ? (
            <Card>
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucune séance créée pour l&apos;instant.</p>
            </Card>
          ) : (
            coachSessions.map((s) => <SessionLibraryRow key={s.id} session={s} onChanged={refetchCoachSessions} />)
          )}
        </div>
      )}
    </div>
  )
}
