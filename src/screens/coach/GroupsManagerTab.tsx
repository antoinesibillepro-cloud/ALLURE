import { useState } from 'react'
import { Card, SectionLabel, Avatar } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../components/Toast'
import { useQuery } from '../../lib/useQuery'
import {
  fetchGroups, createGroup, addAthleteToGroup, removeAthleteFromGroup, moveAthleteToGroup,
  updateGroupName, deleteGroup, fetchClubAthletes, type GroupWithMembers,
} from '../../lib/queries/groups'
import { fetchLatestWellnessScores, type WellnessScore } from '../../lib/queries/stats'

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function FormeBadge({ score }: { score: WellnessScore | undefined }) {
  if (!score) return <span className="text-xs" style={{ color: 'var(--text-2)' }}>Pas de bilan</span>
  const color = score.pct >= 70 ? '#5EBA65' : score.pct >= 40 ? '#F2C400' : '#E4574A'
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
      Forme {score.pct}%
    </span>
  )
}

/**
 * Group + subgroup membership management, folded into Séances (used to be its own nav tab).
 * Picking a top-level group shows its subgroups side by side, each with its athletes —
 * dragging an athlete onto another subgroup's card reassigns them.
 */
export default function GroupsManagerTab() {
  const { profile } = useApp()
  const toast = useToast()
  const { data: groups, loading, refetch } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: clubAthletes } = useQuery(
    () => (profile ? fetchClubAthletes(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: wellness } = useQuery<Record<string, WellnessScore>>(
    () => (profile ? fetchLatestWellnessScores(profile.club_id) : Promise.resolve({})),
    [profile?.club_id],
  )

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupLevel, setNewGroupLevel] = useState('')
  const [busy, setBusy] = useState(false)
  const [newSubgroupName, setNewSubgroupName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [dragAthleteId, setDragAthleteId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const topGroups = (groups ?? []).filter((g) => !g.parent_group_id)
  const group = topGroups.find((g) => g.id === activeGroupId) ?? topGroups[0] ?? null
  const subgroups = group ? (groups ?? []).filter((g) => g.parent_group_id === group.id) : []
  const clusterGroups = group ? [group, ...subgroups] : []

  const clusterMembers = new Map<string, { name: string; vma: number | null; groupId: string }>()
  for (const g of clusterGroups) {
    for (const m of g.members) clusterMembers.set(m.id, { name: m.name, vma: m.vma, groupId: g.id })
  }
  const memberIds = new Set(clusterMembers.keys())
  const availableToAdd = (clubAthletes ?? []).filter((a) => !memberIds.has(a.id))

  async function handleCreateGroup() {
    if (!profile || !newGroupName.trim()) return
    setBusy(true)
    try {
      const g = await createGroup(profile.club_id, profile.id, newGroupName.trim(), newGroupLevel.trim() || null)
      setNewGroupName(''); setNewGroupLevel(''); setShowCreate(false)
      await refetch()
      setActiveGroupId(g.id)
      toast(`Groupe ${g.name} créé`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Création impossible', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateSubgroup() {
    if (!profile || !group || !newSubgroupName.trim()) return
    setBusy(true)
    try {
      const label = newSubgroupName.trim()
      await createGroup(profile.club_id, profile.id, label, null, group.id)
      setNewSubgroupName('')
      await refetch()
      toast(`Sous-groupe ${label} créé`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Création impossible', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteSubgroup(subgroupId: string) {
    if (!group) return
    setBusy(true)
    try {
      const sg = subgroups.find((s) => s.id === subgroupId)
      for (const m of sg?.members ?? []) await moveAthleteToGroup(subgroupId, group.id, m.id)
      await deleteGroup(subgroupId)
      await refetch()
      toast('Sous-groupe supprimé')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Suppression impossible', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleAddAthlete(athleteId: string) {
    if (!group) return
    setBusy(true)
    try {
      await addAthleteToGroup(group.id, athleteId)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveAthlete(athleteId: string, fromGroupId: string) {
    setBusy(true)
    try {
      await removeAthleteFromGroup(fromGroupId, athleteId)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  async function handleAssignSubgroup(athleteId: string, currentGroupId: string, targetGroupId: string) {
    if (currentGroupId === targetGroupId) return
    setBusy(true)
    try {
      await moveAthleteToGroup(currentGroupId, targetGroupId, athleteId)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  async function handleRenameGroup(groupId: string, name: string) {
    if (!name.trim()) return
    setRenameError(null)
    try {
      await updateGroupName(groupId, name.trim())
      await refetch()
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Échec du renommage')
    }
  }

  function handleDropOnCluster(targetGroupId: string) {
    setDropTargetId(null)
    if (!dragAthleteId) return
    const current = clusterMembers.get(dragAthleteId)
    setDragAthleteId(null)
    if (!current) return
    handleAssignSubgroup(dragAthleteId, current.groupId, targetGroupId)
  }

  if (loading) {
    return <div className="p-6 text-center text-sm" style={{ color: 'var(--text-2)' }}>Chargement…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Groupes, sous-groupes et athlètes — glisse un athlète sur un autre sous-groupe pour le déplacer.</p>
        <button onClick={() => setShowCreate((v) => !v)} className="text-xs font-bold px-3 py-2 rounded-xl shrink-0" style={{ background: '#F2C400', color: '#0E0E0D' }}>
          + Créer un groupe
        </button>
      </div>

      {showCreate && (
        <Card className="space-y-3">
          <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nom du groupe (ex: Groupe Élite)"
            className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
          <input value={newGroupLevel} onChange={(e) => setNewGroupLevel(e.target.value)} placeholder="Niveau (optionnel)"
            className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
          <button onClick={handleCreateGroup} disabled={busy || !newGroupName.trim()}
            className="text-xs font-bold px-4 py-2.5 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
            Créer
          </button>
        </Card>
      )}

      {!topGroups.length ? (
        <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucun groupe pour l&apos;instant. Crée ton premier groupe pour commencer.</p></Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {topGroups.map((g) => (
              <button key={g.id} onClick={() => setActiveGroupId(g.id)}
                className="shrink-0 flex flex-col items-start px-4 py-3 rounded-2xl transition-all"
                style={{
                  background: group?.id === g.id ? '#F2C400' : 'var(--card)',
                  boxShadow: group?.id === g.id ? 'none' : 'var(--card-shadow)',
                  minWidth: 140,
                }}>
                <p className="text-sm font-bold leading-none" style={{ color: group?.id === g.id ? '#0E0E0D' : 'var(--text-1)' }}>{g.name}</p>
                <p className="text-[10px] mt-1" style={{ color: group?.id === g.id ? 'rgba(0,0,0,0.6)' : 'var(--text-2)' }}>
                  {g.members.length} athlète{g.members.length > 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>

          {group && (
            <>
              <Card>
                <SectionLabel>Vue d&apos;ensemble</SectionLabel>
                <input key={group.id} defaultValue={group.name} onBlur={(e) => handleRenameGroup(group.id, e.target.value)}
                  className="text-xl font-black bg-transparent outline-none w-full mt-1" style={{ color: 'var(--text-1)' }} />
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{clusterMembers.size} athlètes{group.level ? ` · ${group.level}` : ''}</p>
                {renameError && <p className="text-xs mt-1.5" style={{ color: '#E4574A' }}>{renameError}</p>}
                <div className="flex items-center gap-2 mt-3">
                  <input value={newSubgroupName} onChange={(e) => setNewSubgroupName(e.target.value)} placeholder="Ex: Groupe 1"
                    className="flex-1 rounded-[10px] px-3 py-2 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                  <button onClick={handleCreateSubgroup} disabled={busy || !newSubgroupName.trim()}
                    className="text-xs font-bold px-3 py-2 rounded-[10px] disabled:opacity-50 shrink-0" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                    + Sous-groupe
                  </button>
                  <button onClick={() => setShowAddAthlete((v) => !v)} className="text-xs font-bold px-3 py-2 rounded-[10px] shrink-0" style={{ color: '#F2C400' }}>
                    + Athlète
                  </button>
                </div>
              </Card>

              {showAddAthlete && (
                <Card>
                  <SectionLabel>Ajouter un athlète au groupe</SectionLabel>
                  <div className="mt-2 space-y-2">
                    {availableToAdd.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-2)' }}>Tous les athlètes du club sont déjà dans ce groupe.</p>
                    ) : availableToAdd.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-[12px]" style={{ background: 'var(--surface2)' }}>
                        <div className="flex items-center gap-2">
                          <Avatar initials={initialsOf(a.name)} size={28} />
                          <span className="text-sm" style={{ color: 'var(--text-1)' }}>{a.name}</span>
                        </div>
                        <button disabled={busy} onClick={() => handleAddAthlete(a.id)} className="text-xs font-bold" style={{ color: '#F2C400' }}>Ajouter</button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* One card per cluster (parent group = "non affecté" bucket, then each subgroup) — drag athletes between them */}
              <div className={subgroups.length > 0 ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : ''}>
                {clusterGroups.map((cg) => {
                  const members = [...clusterMembers.entries()].filter(([, m]) => m.groupId === cg.id)
                  const isParent = cg.id === group.id
                  const isDropTarget = dropTargetId === cg.id
                  return (
                    <div key={cg.id} className="rounded-3xl"
                      style={{ outline: isDropTarget ? '2px dashed #F2C400' : 'none', background: isDropTarget ? 'rgba(242,196,0,0.06)' : undefined }}
                      onDragOver={(e) => { if (subgroups.length > 0) { e.preventDefault(); setDropTargetId(cg.id) } }}
                      onDragLeave={() => setDropTargetId((v) => (v === cg.id ? null : v))}
                      onDrop={(e) => { e.preventDefault(); if (subgroups.length > 0) handleDropOnCluster(cg.id) }}>
                    <Card className="!p-4">
                      <div className="flex items-center justify-between mb-2">
                        {isParent ? (
                          <SectionLabel>{subgroups.length > 0 ? 'Non affecté' : 'Athlètes'}</SectionLabel>
                        ) : (
                          <input key={cg.id} defaultValue={cg.name} onBlur={(e) => handleRenameGroup(cg.id, e.target.value)}
                            className="text-sm font-bold bg-transparent outline-none" style={{ color: 'var(--text-1)' }} />
                        )}
                        {!isParent && (
                          <button onClick={() => handleDeleteSubgroup(cg.id)} className="text-[11px] font-semibold shrink-0" style={{ color: '#E4574A' }}>supprimer</button>
                        )}
                      </div>
                      {members.length === 0 ? (
                        <p className="text-xs py-3 text-center" style={{ color: 'var(--text-2)' }}>
                          {subgroups.length > 0 ? 'Dépose un athlète ici' : 'Aucun athlète pour l\'instant.'}
                        </p>
                      ) : (
                        <div className="space-y-0">
                          {members.map(([id, m], i) => (
                            <div key={id} draggable={subgroups.length > 0}
                              onDragStart={() => setDragAthleteId(id)}
                              onDragEnd={() => { setDragAthleteId(null); setDropTargetId(null) }}
                              className="flex items-center gap-2.5 py-2"
                              style={{
                                borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                                cursor: subgroups.length > 0 ? 'grab' : 'default',
                                opacity: dragAthleteId === id ? 0.4 : 1,
                              }}>
                              <Avatar initials={initialsOf(m.name)} size={30} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{m.name}</p>
                                <FormeBadge score={wellness?.[id]} />
                              </div>
                              <button disabled={busy} onClick={() => handleRemoveAthlete(id, m.groupId)} className="text-[11px] font-semibold shrink-0" style={{ color: '#E4574A' }}>
                                retirer
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
