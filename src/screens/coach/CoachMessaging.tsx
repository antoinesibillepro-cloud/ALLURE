import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, IconSearch } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import {
  fetchConversations, fetchMessages, sendMessage, subscribeToConversation, leaveConversation,
  createAnnouncement, createGroupConversation, fetchOrCreateDm, markConversationRead, type ConversationSummary,
} from '../../lib/queries/messages'
import { fetchGroups, fetchClubAthletes, type GroupWithMembers } from '../../lib/queries/groups'
import { useVisualViewport } from '../../lib/useVisualViewport'

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function CoachMessaging() {
  const { profile } = useApp()
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'conv'>('list')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcastGroupId, setBroadcastGroupId] = useState<string>('')
  const [broadcastText, setBroadcastText] = useState('')
  const [broadcastKind, setBroadcastKind] = useState<'group' | 'announcement'>('announcement')
  const [broadcasting, setBroadcasting] = useState(false)
  const [menuForId, setMenuForId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const { height: vpHeight, top: vpTop, keyboardOpen } = useVisualViewport()

  const { data: conversations, refetch: refetchConvs } = useQuery<ConversationSummary[]>(
    () => (profile ? fetchConversations(profile.id, profile.club_id) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: groups } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const { data: athletes } = useQuery(
    () => (profile ? fetchClubAthletes(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )
  const [startingDmId, setStartingDmId] = useState<string | null>(null)

  const athletesWithDm = new Set((conversations ?? []).filter((c) => c.kind === 'dm').map((c) => c.dm_other_id))
  const athletesWithoutDm = (athletes ?? []).filter((a) => !athletesWithDm.has(a.id))

  async function handleStartDm(athleteId: string) {
    if (!profile) return
    setStartingDmId(athleteId)
    try {
      const convoId = await fetchOrCreateDm(profile.club_id, profile.id, athleteId)
      await refetchConvs()
      setActiveConvId(convoId)
      setMobileView('conv')
    } finally {
      setStartingDmId(null)
    }
  }

  const activeConv = conversations?.find((c) => c.id === activeConvId) ?? null
  const { data: messages, refetch: refetchMessages } = useQuery(
    () => (activeConvId ? fetchMessages(activeConvId) : Promise.resolve([])),
    [activeConvId],
  )

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Stamp the conversation read once its messages are on screen.
  useEffect(() => {
    if (!activeConvId || !profile || !messages?.length) return
    markConversationRead(activeConvId, profile.id).catch(() => {})
  }, [activeConvId, profile?.id, messages?.length])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  useEffect(() => {
    if (!activeConvId) return
    return subscribeToConversation(activeConvId, () => { refetchMessages(); refetchConvs() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId])

  const isAnnouncement = activeConv?.kind === 'announcement'

  async function handleSend() {
    if (!profile || !activeConvId || !input.trim()) return
    setSending(true)
    try {
      await sendMessage(activeConvId, profile.id, input.trim())
      setInput('')
      await Promise.all([refetchMessages(), refetchConvs()])
    } finally {
      setSending(false)
    }
  }

  async function handleBroadcast() {
    if (!profile || !broadcastText.trim()) return
    setBroadcasting(true)
    try {
      let convoId: string
      if (broadcastKind === 'announcement') {
        const convo = await createAnnouncement(profile.club_id, profile.id, 'Annonce')
        convoId = convo.id
      } else {
        const group = groups?.find((g) => g.id === broadcastGroupId)
        if (!group) return
        const convo = await createGroupConversation(profile.club_id, profile.id, group.id, group.name, group.members.map((m) => m.id))
        convoId = convo.id
      }
      await sendMessage(convoId, profile.id, broadcastText.trim())
      setShowBroadcast(false)
      setBroadcastText('')
      await refetchConvs()
      setActiveConvId(convoId)
      setMobileView('conv')
    } finally {
      setBroadcasting(false)
    }
  }

  function convTitle(c: ConversationSummary) {
    return c.title || 'Conversation'
  }

  async function handleLeave(convId: string) {
    if (!profile) return
    if (!confirm('Supprimer cette conversation ? Elle disparaîtra de ta liste.')) return
    setLeavingId(convId)
    try {
      await leaveConversation(convId, profile.id)
      setMenuForId(null)
      if (activeConvId === convId) { setActiveConvId(null); setMobileView('list') }
      await refetchConvs()
    } finally {
      setLeavingId(null)
    }
  }

  const convList = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black md:hidden" style={{ color: 'var(--text-1)' }}>Messagerie</h2>
          <div className="hidden md:block" />
          <button onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-[12px]"
            style={{ background: '#F2C400', color: '#0E0E0D' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 4L10 1.5L7.5 11L5 7L1 4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M5 7L7.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Diffuser
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
          <IconSearch />
          <input placeholder="Rechercher..." className="bg-transparent text-sm outline-none flex-1" style={{ color: 'var(--text-1)' }} />
        </div>
      </div>

      {(!!conversations?.length || !!athletesWithoutDm.length) && (
        <div className="flex gap-3 px-4 pb-3 overflow-x-auto shrink-0">
          {conversations?.map((c) => {
            const isPin = c.kind === 'announcement'
            return (
              <button key={c.id} onClick={() => { setActiveConvId(c.id); setMobileView('conv') }}
                className="flex flex-col items-center gap-1.5 shrink-0 w-14">
                <div style={{ outline: activeConvId === c.id ? '2px solid #F2C400' : 'none', outlineOffset: 2, borderRadius: '9999px' }}>
                  <Avatar initials={initialsOf(c.title ?? 'CV')} size={48} yellow={isPin} />
                </div>
                <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--text-2)' }}>{convTitle(c).split(' ')[0]}</span>
              </button>
            )
          })}
          {athletesWithoutDm.map((a) => (
            <button key={a.id} onClick={() => handleStartDm(a.id)} disabled={startingDmId === a.id}
              className="flex flex-col items-center gap-1.5 shrink-0 w-14 disabled:opacity-50">
              <Avatar initials={initialsOf(a.name)} size={48} />
              <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--text-2)' }}>{a.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!conversations?.length && !athletesWithoutDm.length && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-2)' }}>Aucune conversation. Utilise « Diffuser » pour publier une annonce ou écrire à un groupe.</p>
        )}
        {!!conversations?.length && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Conversations</p>
          </div>
        )}
        {conversations?.map((c) => {
          const active = activeConvId === c.id
          const isPin = c.kind === 'announcement'
          return (
            <div key={c.id} className="relative flex items-center gap-3 px-4 py-3 transition-colors"
              style={{
                background: active ? (isPin ? 'rgba(242,196,0,0.08)' : 'var(--surface2)') : isPin ? 'rgba(242,196,0,0.03)' : 'transparent',
                borderBottom: '1px solid var(--border)',
              }}>
              <button onClick={() => { setActiveConvId(c.id); setMobileView('conv') }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <Avatar initials={initialsOf(c.title ?? 'CV')} size={42} yellow={isPin} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: isPin ? '#F2C400' : 'var(--text-1)' }}>{convTitle(c)}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-2)' }}>{c.last_message ?? 'Aucun message'}</p>
                </div>
              </button>
              {!isPin && (
                <div className="relative shrink-0">
                  <button onClick={() => setMenuForId(menuForId === c.id ? null : c.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: 'var(--text-2)' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="7" r="1.3" /><circle cx="7" cy="7" r="1.3" /><circle cx="11" cy="7" r="1.3" /></svg>
                  </button>
                  {menuForId === c.id && (
                    <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
                      style={{ background: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', minWidth: 140 }}>
                      <button onClick={() => handleLeave(c.id)} disabled={leavingId === c.id}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold disabled:opacity-50" style={{ color: '#E4574A' }}>
                        {leavingId === c.id ? 'Suppression…' : 'Supprimer la conversation'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!!athletesWithoutDm.length && (
          <>
            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Athlètes ({athletesWithoutDm.length})</p>
            </div>
            {athletesWithoutDm.map((a) => (
              <button key={a.id} onClick={() => handleStartDm(a.id)} disabled={startingDmId === a.id}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left disabled:opacity-50"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <Avatar initials={initialsOf(a.name)} size={42} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{a.name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-2)' }}>{startingDmId === a.id ? 'Ouverture…' : 'Aucun message'}</p>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )

  const convView = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button className="md:hidden w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
          onClick={() => setMobileView('list')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L5 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {activeConv && (
          <>
            <Avatar initials={initialsOf(activeConv.title ?? 'CV')} size={40} yellow={isAnnouncement} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{convTitle(activeConv)}</p>
              {isAnnouncement && <p className="text-xs" style={{ color: 'var(--text-2)' }}>Visible par tous les athlètes du club</p>}
            </div>
            {!isAnnouncement && (
              <button onClick={() => handleLeave(activeConv.id)} disabled={leavingId === activeConv.id}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50" style={{ color: 'var(--text-2)' }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3 5H13M6 5V3.5C6 3 6.3 2.5 7 2.5H9C9.7 2.5 10 3 10 3.5V5M11.5 5V12.5C11.5 13 11 13.5 10.5 13.5H5.5C5 13.5 4.5 13 4.5 12.5V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5" style={{ background: 'var(--bg)' }}>
        {!activeConv ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-2)' }}>Sélectionne une conversation</div>
        ) : !messages?.length ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <path d="M17 3H3C2.4 3 2 3.4 2 4V13C2 13.6 2.4 14 3 14H8L10 17.5L12 14H17C17.6 14 18 13.6 18 13V4C18 3.4 17.6 3 17 3Z" stroke="var(--text-2)" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucun message pour le moment</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === profile?.id
            const sender = msg.sender as { name?: string; avatar_url?: string | null } | null
            const senderName = sender?.name ?? ''
            const prev = messages[i - 1]
            const sameSenderAsPrev = prev && prev.sender_id === msg.sender_id
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'items-end gap-2'}`}
                style={{ marginTop: sameSenderAsPrev ? 2 : 10, animation: 'msgIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
                {!isMe && (sameSenderAsPrev ? <div className="w-7 shrink-0" /> : <Avatar initials={initialsOf(senderName)} size={28} src={sender?.avatar_url ?? null} />)}
                <div className="max-w-[78%]">
                  {!isMe && !sameSenderAsPrev && <p className="text-[10px] font-bold mb-1 ml-1" style={{ color: 'var(--text-2)' }}>{senderName}</p>}
                  <div className="px-4 py-2.5"
                    style={{
                      background: isMe ? '#F2C400' : 'var(--surface3)',
                      color: isMe ? '#0E0E0D' : 'var(--text-1)',
                      borderRadius: isMe ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    }}>
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                  </div>
                  <p className={`text-[9px] mt-1 ${isMe ? 'text-right' : 'ml-1'}`} style={{ color: 'var(--text-2)' }}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {activeConv && (
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
          <div className="flex items-center gap-2 rounded-full px-3 py-2" style={{ background: 'var(--surface2)' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message…" className="flex-1 bg-transparent text-sm outline-none py-1" style={{ color: 'var(--text-1)' }} />
            <button onClick={handleSend} disabled={sending || !input.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
              style={{ background: input.trim() ? '#F2C400' : 'var(--surface3)', color: input.trim() ? '#0E0E0D' : 'var(--text-2)', transform: input.trim() ? 'scale(1)' : 'scale(0.92)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12.5 7L1.5 1.5L4 7L1.5 12.5L12.5 7Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {showBroadcast && createPortal(
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-4" style={{ background: 'var(--card)', boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black" style={{ color: 'var(--text-1)' }}>Diffuser un message</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Annonce à tout le club, ou message à un groupe</p>
              </div>
              <button onClick={() => setShowBroadcast(false)} className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Type</label>
              <div className="flex gap-2">
                {[{ label: 'Annonce club', key: 'announcement' as const }, { label: 'Groupe', key: 'group' as const }].map(({ label, key }) => (
                  <button key={key} onClick={() => setBroadcastKind(key)} className="flex-1 py-2 rounded-[12px] text-xs font-bold"
                    style={{ background: broadcastKind === key ? '#F2C400' : 'var(--surface2)', color: broadcastKind === key ? '#0E0E0D' : 'var(--text-2)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {broadcastKind === 'group' && (
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Groupe destinataire</label>
                <div className="flex flex-wrap gap-2">
                  {groups?.map((g) => (
                    <button key={g.id} onClick={() => setBroadcastGroupId(g.id)}
                      className="px-3 py-1.5 rounded-[12px] text-xs font-semibold transition-all"
                      style={{
                        background: broadcastGroupId === g.id ? 'rgba(242,196,0,0.15)' : 'var(--surface2)',
                        color: broadcastGroupId === g.id ? '#F2C400' : 'var(--text-2)',
                        border: broadcastGroupId === g.id ? '1px solid rgba(242,196,0,0.3)' : '1px solid transparent',
                      }}>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea rows={4} value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Ton message…" className="w-full rounded-[12px] px-4 py-3 text-sm outline-none resize-none"
              style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />

            <div className="flex gap-3">
              <button onClick={() => { setShowBroadcast(false); setBroadcastText('') }}
                className="flex-1 py-3 rounded-[12px] text-sm font-semibold transition-colors" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                Annuler
              </button>
              <button
                disabled={broadcasting || !broadcastText.trim() || (broadcastKind === 'group' && !broadcastGroupId)}
                onClick={handleBroadcast}
                className="flex-1 py-3 rounded-[12px] text-sm font-bold transition-colors disabled:opacity-40"
                style={{ background: '#F2C400', color: '#0E0E0D' }}>
                {broadcasting ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <style>{`@keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="md:hidden fixed inset-x-0 z-40 flex flex-col"
        style={{ background: 'var(--bg)', top: vpTop, height: vpHeight, paddingBottom: keyboardOpen ? 0 : '5.5rem' }}>
        {mobileView === 'list' ? convList : convView}
      </div>
      <div className="hidden md:flex" style={{ height: 'calc(100vh - 3.5rem)' }}>
        <div className="w-80 shrink-0 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border)' }}>
          {convList}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {convView}
        </div>
      </div>
    </>
  )
}
