import { useState } from 'react'
import { Card, SectionLabel, BtnPrimary, BtnSecondary } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchGroups, type GroupWithMembers } from '../../lib/queries/groups'
import {
  createSession, fetchCoachSessions, updateSession, deleteSession, fetchSessionRealizations,
  type AthleteRealization,
} from '../../lib/queries/sessions'
import { fetchSessionTypes, createSessionType, type SessionTypeRow } from '../../lib/queries/sessionTypes'
import { fetchOrCreateDm, sendMessage } from '../../lib/queries/messages'

function MiniCalendar({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const base = new Date()
  const viewMonth = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1)
  const monthLabel = viewMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const startOffset = (viewMonth.getDay() + 6) % 7
  const cells: Array<number | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  function iso(d: number) {
    return `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setMonthOffset((m) => m - 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <p className="text-xs font-bold capitalize" style={{ color: 'var(--text-1)' }}>{monthLabel}</p>
        <button type="button" onClick={() => setMonthOffset((m) => m + 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center text-[8px] font-bold uppercase" style={{ color: 'var(--text-2)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />
          const dateIso = iso(d)
          const selected = dateIso === value
          return (
            <button type="button" key={d} onClick={() => onChange(dateIso)}
              className="aspect-square rounded-lg text-[11px] font-semibold flex items-center justify-center"
              style={{ background: selected ? '#F2C400' : 'var(--surface2)', color: selected ? '#0E0E0D' : 'var(--text-1)' }}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TargetSplitsEditor({ splits, onChange }: { splits: string[]; onChange: (splits: string[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Chronos cibles par répétition (optionnel)</p>
        <button type="button" onClick={() => onChange([...splits, ''])} className="text-xs font-bold" style={{ color: '#F2C400' }}>+ Ajouter</button>
      </div>
      {splits.length > 0 && (
        <div className="space-y-1.5">
          {splits.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-2)' }}>Rép. {i + 1}</span>
              <input value={s} onChange={(e) => onChange(splits.map((v, j) => j === i ? e.target.value : v))}
                placeholder="secondes" inputMode="decimal"
                className="flex-1 px-3 py-1.5 rounded-[10px] text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              <button type="button" onClick={() => onChange(splits.filter((_, j) => j !== i))} className="text-xs" style={{ color: '#E4574A' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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

function SessionLibraryRow({ session, onChanged, clubId, coachId, color }: { session: CoachSessionRow; onChanged: () => void; clubId: string; coachId: string; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(session.title)
  const [description, setDescription] = useState(session.description ?? '')
  const [duration, setDuration] = useState(session.duration_min ?? 0)
  const [distance, setDistance] = useState(session.distance_km ?? 0)
  const [vmaPercent, setVmaPercent] = useState(session.vma_percent ?? 0)
  const [scheduledDate, setScheduledDate] = useState(session.scheduled_at.slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [remindingId, setRemindingId] = useState<string | null>(null)
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set())

  async function handleRemind(athleteId: string, name: string) {
    setRemindingId(athleteId)
    try {
      const convoId = await fetchOrCreateDm(clubId, coachId, athleteId)
      await sendMessage(convoId, coachId, `${name.split(' ')[0]}, pense à valider ta séance "${session.title}" et à rentrer tes chronos !`)
      setRemindedIds((prev) => new Set(prev).add(athleteId))
    } finally {
      setRemindingId(null)
    }
  }

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
        <div className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: `${color}1f` }}>
          <span className="text-xs font-black" style={{ color }}>{new Date(session.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric' })}</span>
          <span className="text-[8px] font-bold uppercase" style={{ color }}>{new Date(session.scheduled_at).toLocaleDateString('fr-FR', { month: 'short' })}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-1)' }}>{session.title}</p>
          </div>
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
                      {r.status === 'done' ? (
                        <span className="text-xs font-bold" style={{ color: '#F2C400' }}>
                          {paceFromDistanceDuration(r.actual_distance_km, r.actual_duration_min) ?? (r.rpe ? `RPE ${r.rpe}` : '')}
                        </span>
                      ) : remindedIds.has(r.profile_id) ? (
                        <span className="text-xs font-semibold shrink-0" style={{ color: '#5EBA65' }}>Rappel envoyé</span>
                      ) : (
                        <button onClick={() => handleRemind(r.profile_id, r.name)} disabled={remindingId === r.profile_id}
                          className="text-xs font-semibold shrink-0 underline disabled:opacity-50" style={{ color: 'var(--text-2)' }}>
                          {remindingId === r.profile_id ? '…' : 'Rappel'}
                        </button>
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

interface SubgroupBlockState {
  groupId: string
  content: string
  isRest: boolean
  targetSplits: string[]
}

export default function CoachSessions() {
  const { profile } = useApp()
  const [tab, setTab] = useState<'create' | 'library'>('create')
  const [sessionType, setSessionType] = useState('')
  const [duration, setDuration] = useState(55)
  const [distance, setDistance] = useState(12)
  const [vmaPercent, setVmaPercent] = useState(88)
  const [description, setDescription] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10))
  const [timeSlot, setTimeSlot] = useState<'matin' | 'apres-midi'>('matin')
  const [targetSplits, setTargetSplits] = useState<string[]>([])
  const [subgroupBlocks, setSubgroupBlocks] = useState<Record<string, SubgroupBlockState>>({})
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishedOk, setPublishedOk] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedOk, setGeneratedOk] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')

  const { data: groups, loading: groupsLoading } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: sessionTypes, refetch: refetchSessionTypes } = useQuery<SessionTypeRow[]>(
    () => (profile ? fetchSessionTypes(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )

  const allGroups = groups ?? []
  const topGroups = allGroups.filter((g) => !g.parent_group_id)
  const activeGroup = allGroups.find((g) => g.id === selectedGroupId) ?? topGroups[0] ?? null
  const effectiveGroupId = selectedGroupId || activeGroup?.id || ''
  const subgroups = allGroups.filter((g) => g.parent_group_id === effectiveGroupId)

  if (!sessionType && sessionTypes?.length) setSessionType(sessionTypes[0].name)

  function subgroupState(groupId: string): SubgroupBlockState {
    return subgroupBlocks[groupId] ?? { groupId, content: '', isRest: false, targetSplits: [] }
  }
  function updateSubgroupState(groupId: string, patch: Partial<SubgroupBlockState>) {
    setSubgroupBlocks((prev) => ({ ...prev, [groupId]: { ...subgroupState(groupId), ...patch } }))
  }

  const { data: coachSessions, refetch: refetchCoachSessions } = useQuery<CoachSessionRow[]>(
    () => (profile && tab === 'library' ? (fetchCoachSessions(profile.club_id) as unknown as Promise<CoachSessionRow[]>) : Promise.resolve([])),
    [profile?.club_id, tab],
  )

  async function handleAddSessionType() {
    if (!profile || !newTypeName.trim()) return
    await createSessionType(profile.club_id, newTypeName.trim())
    setSessionType(newTypeName.trim())
    setNewTypeName('')
    await refetchSessionTypes()
  }

  async function handlePublish(status: 'draft' | 'published') {
    if (!profile || !effectiveGroupId) return
    setPublishing(true)
    setPublishError(null)
    setPublishedOk(false)
    try {
      const workBlocks = subgroups
        .map((sg) => subgroupState(sg.id))
        .filter((b) => b.content.trim() || b.isRest || b.targetSplits.some((s) => s.trim()))
        .map((b) => ({
          group_id: b.groupId,
          label: subgroups.find((sg) => sg.id === b.groupId)?.name ?? '',
          content: b.content,
          target_pace_sec_per_km: null,
          is_rest: b.isRest,
          target_splits: b.targetSplits.map((s) => parseFloat(s.replace(',', '.'))).filter((n) => !Number.isNaN(n) && n > 0),
        }))
      const mainTargetSplits = targetSplits.map((s) => parseFloat(s.replace(',', '.'))).filter((n) => !Number.isNaN(n) && n > 0)
      if (mainTargetSplits.length > 0) {
        workBlocks.unshift({ group_id: effectiveGroupId, label: activeGroup?.name ?? '', content: description, target_pace_sec_per_km: null, is_rest: false, target_splits: mainTargetSplits })
      }
      await createSession(profile.club_id, profile.id, {
        title: sessionType,
        type: sessionType,
        description,
        duration_min: duration,
        distance_km: distance,
        vma_percent: vmaPercent,
        scheduled_at: new Date(scheduledDate).toISOString(),
        time_slot: timeSlot,
        group_ids: [effectiveGroupId, ...subgroups.map((sg) => sg.id)],
        status,
        work_blocks: workBlocks,
      })
      setPublishedOk(true)
      setDescription('')
      setTargetSplits([])
      setSubgroupBlocks({})
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
              <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Thème de séance</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {sessionTypes?.map((t) => (
                  <button key={t.id} onClick={() => setSessionType(t.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-semibold transition-all"
                    style={{
                      background: sessionType === t.name ? `${t.color}26` : 'var(--surface2)',
                      color: sessionType === t.name ? t.color : 'var(--text-2)',
                      border: sessionType === t.name ? `1px solid ${t.color}4d` : '1px solid transparent',
                    }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Nouveau thème…"
                  className="flex-1 rounded-[10px] px-3 py-1.5 text-xs outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                <button onClick={handleAddSessionType} disabled={!newTypeName.trim()} className="text-xs font-bold px-2.5 py-1.5 rounded-[10px] disabled:opacity-50" style={{ color: '#F2C400' }}>
                  + Ajouter
                </button>
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

            {/* Group + slot */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Groupe destinataire</label>
                <select value={effectiveGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}
                  disabled={groupsLoading || !topGroups.length}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none appearance-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                  {!topGroups.length && <option value="">Aucun groupe — crée-en un d'abord</option>}
                  {topGroups.map((g) => {
                    const kids = allGroups.filter((sg) => sg.parent_group_id === g.id)
                    return (
                      <optgroup key={g.id} label={g.name}>
                        <option value={g.id}>{g.name} — tout le groupe ({g.members.length})</option>
                        {kids.map((sg) => (
                          <option key={sg.id} value={sg.id}>↳ {sg.name} ({sg.members.length})</option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
                {activeGroup?.parent_group_id && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-2)' }}>Séance envoyée uniquement au sous-groupe {activeGroup.name}.</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Créneau</label>
                <div className="flex gap-1 p-0.5 rounded-[12px]" style={{ background: 'var(--surface2)' }}>
                  {([{ id: 'matin' as const, label: 'Matin' }, { id: 'apres-midi' as const, label: 'Après-midi' }]).map((s) => (
                    <button key={s.id} onClick={() => setTimeSlot(s.id)}
                      className="flex-1 py-2 rounded-[10px] text-xs font-bold transition-all"
                      style={{ background: timeSlot === s.id ? '#F2C400' : 'transparent', color: timeSlot === s.id ? '#0E0E0D' : 'var(--text-2)' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Date</label>
              <MiniCalendar value={scheduledDate} onChange={setScheduledDate} />
            </div>

            <TargetSplitsEditor splits={targetSplits} onChange={setTargetSplits} />
          </Card>

          {/* Sous-groupes: contenu différencié par sous-groupe pour la même séance */}
          {subgroups.length > 0 && (
            <Card>
              <SectionLabel>Contenu par sous-groupe</SectionLabel>
              <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-2)' }}>Laisse vide pour appliquer le contenu ci-dessus à tout le groupe.</p>
              <div className="space-y-3">
                {subgroups.map((sg) => {
                  const st = subgroupState(sg.id)
                  return (
                    <div key={sg.id} className="rounded-2xl p-3 space-y-2" style={{ background: 'var(--surface2)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{sg.name} <span className="text-xs font-normal" style={{ color: 'var(--text-2)' }}>({sg.members.length})</span></p>
                        <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                          <input type="checkbox" checked={st.isRest} onChange={(e) => updateSubgroupState(sg.id, { isRest: e.target.checked })} />
                          Repos
                        </label>
                      </div>
                      {!st.isRest && (
                        <>
                          <textarea value={st.content} onChange={(e) => updateSubgroupState(sg.id, { content: e.target.value })} rows={2}
                            placeholder="Contenu spécifique à ce sous-groupe…"
                            className="w-full rounded-[10px] px-3 py-2 text-sm outline-none resize-none" style={{ background: 'var(--card)', color: 'var(--text-1)' }} />
                          <TargetSplitsEditor splits={st.targetSplits} onChange={(splits) => updateSubgroupState(sg.id, { targetSplits: splits })} />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

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
            coachSessions.map((s) => profile && (
              <SessionLibraryRow key={s.id} session={s} onChanged={refetchCoachSessions} clubId={profile.club_id} coachId={profile.id}
                color={sessionTypes?.find((t) => t.name === s.type)?.color ?? '#F2C400'} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
