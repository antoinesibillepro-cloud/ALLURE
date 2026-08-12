import { useState } from 'react'
import { Card, SectionLabel, Avatar } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import {
  fetchClubMembers, updateMemberRole, removeMember, updateClubName,
  fetchClubInvites, createClubInvite, type ClubMember, type ClubInvite,
} from '../../lib/queries/clubAdmin'

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function CoachAdmin() {
  const { profile } = useApp()
  const { data: members, refetch: refetchMembers } = useQuery<ClubMember[]>(
    () => (profile ? fetchClubMembers(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: invites, refetch: refetchInvites } = useQuery<ClubInvite[]>(
    () => (profile ? fetchClubInvites(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )

  const [clubName, setClubName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [creatingInvite, setCreatingInvite] = useState<'athlete' | 'coach' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<ClubMember | null>(null)

  async function handleSaveClubName() {
    if (!profile || !clubName.trim()) return
    setSavingName(true)
    try {
      await updateClubName(profile.club_id, clubName.trim())
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } finally {
      setSavingName(false)
    }
  }

  async function handleCreateInvite(role: 'athlete' | 'coach') {
    if (!profile) return
    setCreatingInvite(role)
    try {
      await createClubInvite(profile.club_id, role)
      await refetchInvites()
    } finally {
      setCreatingInvite(null)
    }
  }

  async function handleToggleRole(m: ClubMember) {
    setBusyId(m.id)
    try {
      await updateMemberRole(m.id, m.role === 'coach' ? 'athlete' : 'coach')
      await refetchMembers()
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(m: ClubMember) {
    setBusyId(m.id)
    try {
      await removeMember(m.id)
      setConfirmRemove(null)
      await refetchMembers()
    } finally {
      setBusyId(null)
    }
  }

  const athletes = (members ?? []).filter((m) => m.role === 'athlete')
  const coaches = (members ?? []).filter((m) => m.role === 'coach')

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto pb-10">
      <div className="pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Administration du club</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
          {coaches.length} coach{coaches.length > 1 ? 's' : ''} · {athletes.length} athlète{athletes.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Club settings ── */}
      <Card>
        <SectionLabel>Nom du club</SectionLabel>
        <div className="flex items-center gap-2 mt-2">
          <input value={clubName} onChange={(e) => setClubName(e.target.value)}
            placeholder={profile?.name ? 'Nom du club' : ''}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
          <button onClick={handleSaveClubName} disabled={savingName || !clubName.trim()}
            className="text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50"
            style={{ background: nameSaved ? '#5EBA65' : '#F2C400', color: '#0E0E0D', transition: 'background 0.3s ease' }}>
            {nameSaved ? 'Enregistré' : savingName ? '…' : 'Enregistrer'}
          </button>
        </div>
      </Card>

      {/* ── Invite codes ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Codes d&apos;invitation</SectionLabel>
          <div className="flex gap-2">
            <button onClick={() => handleCreateInvite('athlete')} disabled={!!creatingInvite}
              className="text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
              {creatingInvite === 'athlete' ? '…' : '+ Athlète'}
            </button>
            <button onClick={() => handleCreateInvite('coach')} disabled={!!creatingInvite}
              className="text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
              {creatingInvite === 'coach' ? '…' : '+ Coach'}
            </button>
          </div>
        </div>
        {!invites?.length ? (
          <p className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Aucun code généré. Crée un code pour inviter un nouvel athlète ou coach.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((inv) => {
              const exhausted = inv.uses >= inv.max_uses
              return (
                <div key={inv.code} className="flex items-center gap-3 py-2.5 px-3 rounded-2xl" style={{ background: 'var(--surface2)' }}>
                  <span className="font-mono text-base font-black tracking-widest" style={{ color: exhausted ? 'var(--text-2)' : '#F2C400' }}>{inv.code}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: inv.role === 'coach' ? 'rgba(242,196,0,0.15)' : 'var(--surface3)', color: inv.role === 'coach' ? '#F2C400' : 'var(--text-2)' }}>
                    {inv.role === 'coach' ? 'Coach' : 'Athlète'}
                  </span>
                  <span className="flex-1 text-right text-xs" style={{ color: exhausted ? '#E4574A' : 'var(--text-2)' }}>
                    {exhausted ? 'Utilisé' : `${inv.uses}/${inv.max_uses} utilisation${inv.max_uses > 1 ? 's' : ''}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Coaches ── */}
      <Card>
        <SectionLabel>Coaches</SectionLabel>
        <div className="mt-2 space-y-1">
          {coaches.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5">
              <Avatar initials={initialsOf(m.name)} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{m.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{m.email}</p>
              </div>
              {m.id !== profile?.id && (
                <button onClick={() => handleToggleRole(m)} disabled={busyId === m.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                  {busyId === m.id ? '…' : 'Passer athlète'}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Athletes ── */}
      <Card>
        <SectionLabel>Athlètes</SectionLabel>
        {!athletes.length ? (
          <p className="text-sm py-3" style={{ color: 'var(--text-2)' }}>Aucun athlète pour l&apos;instant.</p>
        ) : (
          <div className="mt-2 space-y-1">
            {athletes.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <Avatar initials={initialsOf(m.name)} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{m.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{m.email}{m.vma ? ` · VMA ${m.vma} km/h` : ''}</p>
                </div>
                <button onClick={() => handleToggleRole(m)} disabled={busyId === m.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                  {busyId === m.id ? '…' : 'Promouvoir coach'}
                </button>
                <button onClick={() => setConfirmRemove(m)}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ color: '#E4574A' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: 'var(--card)' }}>
            <p className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Retirer {confirmRemove.name} du club ?</p>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-2)' }}>
              Cette personne perdra l&apos;accès au club (données conservées, mais elle ne verra plus rien tant qu&apos;elle n&apos;est pas réinvitée).
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleRemove(confirmRemove)} disabled={busyId === confirmRemove.id}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: '#E4574A', color: '#fff' }}>
                {busyId === confirmRemove.id ? '…' : 'Retirer'}
              </button>
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
