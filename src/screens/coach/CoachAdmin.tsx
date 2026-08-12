import { useState } from 'react'
import { Card, SectionLabel } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import {
  fetchClubMembers, updateMemberRole, updateMemberName, updateMemberVma, updateMemberGroup, removeMember,
  updateClubName, resetPasswordEmail, createAccountViaAdmin, sendMemberEmail,
  fetchClubInvites, createClubInvite, type ClubMember, type ClubInvite,
} from '../../lib/queries/clubAdmin'
import { fetchGroups, type GroupWithMembers } from '../../lib/queries/groups'

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function CoachAdmin() {
  const { profile } = useApp()
  const { data: members, refetch: refetchMembers } = useQuery<ClubMember[]>(
    () => (profile ? fetchClubMembers(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: groups } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
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
  const [actionMsg, setActionMsg] = useState<{ id: string; text: string } | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'athlete' | 'coach'>('athlete')
  const [newGroupId, setNewGroupId] = useState('')
  const [newSendEmail, setNewSendEmail] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; emailError: string | null } | null>(null)

  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importGroupId, setImportGroupId] = useState('')
  const [importSendEmail, setImportSendEmail] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const [emailTarget, setEmailTarget] = useState<ClubMember | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSentMsg, setEmailSentMsg] = useState<string | null>(null)

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

  async function handleUpdateRole(m: ClubMember, role: 'athlete' | 'coach') {
    setBusyId(m.id)
    try {
      await updateMemberRole(m.id, role)
      await refetchMembers()
    } finally {
      setBusyId(null)
    }
  }

  async function handleUpdateGroup(m: ClubMember, groupId: string) {
    setBusyId(m.id)
    try {
      await updateMemberGroup(m.id, groupId || null)
      await refetchMembers()
    } finally {
      setBusyId(null)
    }
  }

  async function handleUpdateVma(m: ClubMember, value: string) {
    const vma = value.trim() ? parseFloat(value.replace(',', '.')) : null
    if (vma === m.vma) return
    await updateMemberVma(m.id, vma)
    await refetchMembers()
  }

  async function handleUpdateName(m: ClubMember, value: string) {
    if (!value.trim() || value.trim() === m.name) return
    await updateMemberName(m.id, value.trim())
    await refetchMembers()
  }

  async function handleResetPassword(m: ClubMember) {
    setBusyId(m.id)
    try {
      await resetPasswordEmail(m.id)
      setActionMsg({ id: m.id, text: 'Email envoyé' })
      setTimeout(() => setActionMsg(null), 3000)
    } catch {
      setActionMsg({ id: m.id, text: 'Échec de l\'envoi' })
      setTimeout(() => setActionMsg(null), 3000)
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

  async function handleCreateAccount() {
    if (!newName.trim() || !newEmail.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const password = randomPassword()
      const result = await createAccountViaAdmin({
        email: newEmail.trim().toLowerCase(), password, name: newName.trim(), role: newRole, groupId: newGroupId || null,
        sendWelcomeEmail: newSendEmail,
      })
      setCreatedCreds({ email: newEmail.trim().toLowerCase(), password, emailError: result.emailError })
      setNewName(''); setNewEmail(''); setNewGroupId('')
      await refetchMembers()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setCreating(false)
    }
  }

  async function handleImport() {
    if (!importText.trim()) return
    setImporting(true)
    setImportResult(null)
    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean)
    let ok = 0, fail = 0
    for (const line of lines) {
      const parts = line.split(/[;,\t]| - /).map((p) => p.trim()).filter(Boolean)
      if (parts.length < 2) { fail++; continue }
      const [name, email] = parts
      try {
        await createAccountViaAdmin({ email: email.toLowerCase(), password: randomPassword(), name, role: 'athlete', groupId: importGroupId || null, sendWelcomeEmail: importSendEmail })
        ok++
      } catch {
        fail++
      }
    }
    setImporting(false)
    setImportResult(`${ok} compte${ok > 1 ? 's' : ''} créé${ok > 1 ? 's' : ''}${fail ? `, ${fail} échec${fail > 1 ? 's' : ''}` : ''}`)
    setImportText('')
    await refetchMembers()
  }

  async function handleSendEmail() {
    if (!emailTarget || !emailSubject.trim() || !emailBody.trim()) return
    setSendingEmail(true)
    try {
      await sendMemberEmail(emailTarget.email, emailSubject.trim(), emailBody.trim())
      setEmailSentMsg('Email envoyé !')
      setTimeout(() => { setEmailTarget(null); setEmailSentMsg(null); setEmailSubject(''); setEmailBody('') }, 1500)
    } catch (err) {
      setEmailSentMsg(err instanceof Error ? err.message : "Échec de l'envoi")
    } finally {
      setSendingEmail(false)
    }
  }

  const athletes = (members ?? []).filter((m) => m.role === 'athlete')
  const coaches = (members ?? []).filter((m) => m.role === 'coach')

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto pb-10">
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
            placeholder="Nom du club"
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
          <p className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Aucun code généré.</p>
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

      {/* ── Comptes ── */}
      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3 flex-wrap gap-2">
          <SectionLabel>Comptes ({members?.length ?? 0})</SectionLabel>
          <div className="flex gap-2">
            <button onClick={() => { setShowCreate((v) => !v); setShowImport(false) }}
              className="text-xs font-bold px-3 py-2 rounded-xl" style={{ background: '#F2C400', color: '#0E0E0D' }}>
              + Créer un compte
            </button>
            <button onClick={() => { setShowImport((v) => !v); setShowCreate(false) }}
              className="text-xs font-bold px-3 py-2 rounded-xl" style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
              Importer une liste
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="mx-4 mb-4 p-4 rounded-2xl space-y-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            {createdCreds ? (
              <div className="text-center py-2">
                <p className="text-sm font-bold" style={{ color: '#5EBA65' }}>Compte créé !</p>
                {newSendEmail && (
                  <p className="text-xs mt-1" style={{ color: createdCreds.emailError ? '#E4574A' : '#5EBA65' }}>
                    {createdCreds.emailError ? `Email non envoyé : ${createdCreds.emailError}` : 'Email de bienvenue envoyé.'}
                  </p>
                )}
                <p className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>Identifiants (au cas où) :</p>
                <p className="text-sm font-mono mt-1" style={{ color: 'var(--text-1)' }}>{createdCreds.email}</p>
                <p className="text-sm font-mono" style={{ color: 'var(--text-1)' }}>{createdCreds.password}</p>
                <button onClick={() => { setCreatedCreds(null); setShowCreate(false) }} className="text-xs font-semibold mt-3" style={{ color: '#F2C400' }}>Fermer</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom complet"
                    className="rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email"
                    className="rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'athlete' | 'coach')}
                    className="rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
                    <option value="athlete">Athlète</option>
                    <option value="coach">Coach</option>
                  </select>
                  <select value={newGroupId} onChange={(e) => setNewGroupId(e.target.value)} disabled={newRole !== 'athlete'}
                    className="rounded-[10px] px-3 py-2.5 text-sm outline-none disabled:opacity-40" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
                    <option value="">Sans groupe</option>
                    {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
                  <input type="checkbox" checked={newSendEmail} onChange={(e) => setNewSendEmail(e.target.checked)} />
                  Envoyer un email de bienvenue avec les identifiants
                </label>
                {createError && <p className="text-xs" style={{ color: '#E4574A' }}>{createError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleCreateAccount} disabled={creating || !newName.trim() || !newEmail.trim()}
                    className="text-xs font-bold px-4 py-2 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                    {creating ? '…' : 'Créer'}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="text-xs font-semibold px-4 py-2 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
                </div>
              </>
            )}
          </div>
        )}

        {showImport && (
          <div className="mx-4 mb-4 p-4 rounded-2xl space-y-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>Une ligne par athlète, format : <span className="font-mono">Nom ; email</span></p>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={5}
              placeholder={'Jean Dupont ; jean.dupont@mail.com\nMarie Martin ; marie.martin@mail.com'}
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none resize-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            <select value={importGroupId} onChange={(e) => setImportGroupId(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--card)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
              <option value="">Sans groupe</option>
              {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
              <input type="checkbox" checked={importSendEmail} onChange={(e) => setImportSendEmail(e.target.checked)} />
              Envoyer un email de bienvenue à chaque compte créé
            </label>
            {importResult && <p className="text-xs" style={{ color: '#5EBA65' }}>{importResult}</p>}
            <div className="flex gap-2">
              <button onClick={handleImport} disabled={importing || !importText.trim()}
                className="text-xs font-bold px-4 py-2 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                {importing ? 'Import…' : 'Importer'}
              </button>
              <button onClick={() => setShowImport(false)} className="text-xs font-semibold px-4 py-2 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto pb-2">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                {['Nom', 'Email', 'Rôle', 'Groupe', 'VMA', 'Actions'].map((h) => (
                  <th key={h} className="text-[9px] font-bold uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--text-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members?.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-2">
                    <input defaultValue={m.name} onBlur={(e) => handleUpdateName(m, e.target.value)}
                      className="text-sm font-semibold bg-transparent outline-none w-full" style={{ color: 'var(--text-1)' }} />
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs truncate block max-w-[180px]" style={{ color: 'var(--text-2)' }}>{m.email}</span>
                  </td>
                  <td className="px-4 py-2">
                    <select value={m.role} disabled={busyId === m.id || m.id === profile?.id}
                      onChange={(e) => handleUpdateRole(m, e.target.value as 'athlete' | 'coach')}
                      className="text-xs rounded-lg px-2 py-1.5 outline-none disabled:opacity-50" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
                      <option value="athlete">Athlète</option>
                      <option value="coach">Coach</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select value={m.group_id ?? ''} disabled={busyId === m.id || m.role !== 'athlete'}
                      onChange={(e) => handleUpdateGroup(m, e.target.value)}
                      className="text-xs rounded-lg px-2 py-1.5 outline-none disabled:opacity-40 max-w-[140px]" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
                      <option value="">—</option>
                      {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" defaultValue={m.vma ?? ''} placeholder="—" inputMode="decimal"
                      onBlur={(e) => handleUpdateVma(m, e.target.value)}
                      className="text-sm bg-transparent outline-none w-14" style={{ color: 'var(--text-1)' }} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      {actionMsg?.id === m.id ? (
                        <span className="text-xs font-semibold" style={{ color: '#5EBA65' }}>{actionMsg.text}</span>
                      ) : (
                        <button onClick={() => handleResetPassword(m)} disabled={busyId === m.id} className="text-xs font-semibold underline disabled:opacity-50" style={{ color: 'var(--text-2)' }}>
                          réinit. mot de passe
                        </button>
                      )}
                      <button onClick={() => { setEmailTarget(m); setEmailSubject(''); setEmailBody(''); setEmailSentMsg(null) }}
                        className="text-xs font-semibold underline" style={{ color: 'var(--text-2)' }}>
                        envoyer un email
                      </button>
                      {m.id !== profile?.id && (
                        <button onClick={() => setConfirmRemove(m)} className="text-xs font-semibold" style={{ color: '#E4574A' }}>supprimer</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] px-4 pb-4 pt-1" style={{ color: 'var(--text-2)' }}>
          Les modifications sont enregistrées dès que tu quittes un champ.
        </p>
      </Card>

      {emailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: 'var(--card)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Envoyer un email</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>À {emailTarget.name} · {emailTarget.email}</p>
              </div>
              <button onClick={() => setEmailTarget(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
            <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Objet"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={5} placeholder="Message"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none resize-none" style={{ background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)' }} />
            {emailSentMsg && <p className="text-xs" style={{ color: emailSentMsg.includes('envoyé') ? '#5EBA65' : '#E4574A' }}>{emailSentMsg}</p>}
            <div className="flex gap-2">
              <button onClick={handleSendEmail} disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
                className="text-xs font-bold px-4 py-2.5 rounded-[10px] disabled:opacity-50" style={{ background: '#F2C400', color: '#0E0E0D' }}>
                {sendingEmail ? 'Envoi…' : 'Envoyer'}
              </button>
              <button onClick={() => setEmailTarget(null)} className="text-xs font-semibold px-4 py-2.5 rounded-[10px]" style={{ color: 'var(--text-2)' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

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
