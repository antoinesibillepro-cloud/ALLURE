import { useState } from 'react'
import { Card, SectionLabel, BtnPrimary, Avatar } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchGroups, createGroup, addAthleteToGroup, removeAthleteFromGroup, fetchClubAthletes, type GroupWithMembers } from '../../lib/queries/groups'

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function CoachGroups() {
  const { profile } = useApp()
  const { data: groups, loading, refetch } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: clubAthletes } = useQuery(
    () => (profile ? fetchClubAthletes(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupLevel, setNewGroupLevel] = useState('')
  const [busy, setBusy] = useState(false)

  const group = groups?.find((g) => g.id === activeGroupId) ?? groups?.[0] ?? null
  const memberIds = new Set(group?.members.map((m) => m.id))
  const availableToAdd = (clubAthletes ?? []).filter((a) => !memberIds.has(a.id))

  async function handleCreateGroup() {
    if (!profile || !newGroupName.trim()) return
    setBusy(true)
    try {
      const g = await createGroup(profile.club_id, profile.id, newGroupName.trim(), newGroupLevel.trim() || null)
      setNewGroupName('')
      setNewGroupLevel('')
      setShowCreate(false)
      await refetch()
      setActiveGroupId(g.id)
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

  async function handleRemoveAthlete(athleteId: string) {
    if (!group) return
    setBusy(true)
    try {
      await removeAthleteFromGroup(group.id, athleteId)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-sm" style={{ color: 'var(--text-2)' }}>Chargement…</div>
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Groupes</h1>
        <BtnPrimary className="text-xs !py-2 !px-3" onClick={() => setShowCreate((v) => !v)}>+ Créer un groupe</BtnPrimary>
      </div>

      {showCreate && (
        <Card className="space-y-3">
          <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nom du groupe (ex: Groupe Élite)"
            className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
          <input value={newGroupLevel} onChange={(e) => setNewGroupLevel(e.target.value)} placeholder="Niveau (optionnel)"
            className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
          <BtnPrimary onClick={handleCreateGroup} disabled={busy || !newGroupName.trim()}>Créer</BtnPrimary>
        </Card>
      )}

      {!groups?.length ? (
        <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucun groupe pour l'instant. Crée ton premier groupe pour commencer.</p></Card>
      ) : (
        <>
          {/* Group selector */}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {groups.map((g) => (
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
                <h2 className="text-xl font-black" style={{ color: 'var(--text-1)' }}>{group.name}</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{group.members.length} athlètes{group.level ? ` · ${group.level}` : ''}</p>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Athlètes</SectionLabel>
                  <button onClick={() => setShowAddAthlete((v) => !v)} className="text-xs font-semibold" style={{ color: '#F2C400' }}>
                    + Ajouter un athlète
                  </button>
                </div>

                {showAddAthlete && (
                  <div className="mb-4 space-y-2">
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
                )}

                {group.members.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-2)' }}>Aucun athlète dans ce groupe pour l'instant.</p>
                ) : (
                  <div className="space-y-0">
                    {group.members.map((m, i) => (
                      <div key={m.id} className="flex items-center gap-3 py-3"
                        style={{ borderBottom: i < group.members.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <Avatar initials={initialsOf(m.name)} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{m.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-2)' }}>{m.vma ? `VMA ${m.vma}` : 'VMA non renseignée'}</p>
                        </div>
                        <button disabled={busy} onClick={() => handleRemoveAthlete(m.id)} className="text-xs font-semibold" style={{ color: '#E4574A' }}>Retirer</button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
