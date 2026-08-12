import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, IconSearch } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import {
  fetchConversations, fetchMessages, sendMessage, subscribeToConversation,
  createAnnouncement, createGroupConversation, type ConversationSummary,
} from '../../lib/queries/messages'
import { fetchGroups, type GroupWithMembers } from '../../lib/queries/groups'

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
  const endRef = useRef<HTMLDivElement>(null)

  const { data: conversations, refetch: refetchConvs } = useQuery<ConversationSummary[]>(
    () => (profile ? fetchConversations(profile.id, profile.club_id) : Promise.resolve([])),
    [profile?.id],
  )
  const { data: groups } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )

  const activeConv = conversations?.find((c) => c.id === activeConvId) ?? null
  const { data: messages, refetch: refetchMessages } = useQuery(
    () => (activeConvId ? fetchMessages(activeConvId) : Promise.resolve([])),
    [activeConvId],
  )

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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

  const ConvList = () => (
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
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 mb-2" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
          <IconSearch />
          <input placeholder="Rechercher..." className="bg-transparent text-sm outline-none flex-1" style={{ color: 'var(--text-1)' }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!conversations?.length && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-2)' }}>Aucune conversation. Utilise « Diffuser » pour publier une annonce ou écrire à un groupe.</p>
        )}
        {conversations?.map((c) => {
          const active = activeConvId === c.id
          const isPin = c.kind === 'announcement'
          return (
            <button key={c.id} onClick={() => { setActiveConvId(c.id); setMobileView('conv') }}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
              style={{
                background: active ? (isPin ? 'rgba(242,196,0,0.08)' : 'var(--surface2)') : isPin ? 'rgba(242,196,0,0.03)' : 'transparent',
                borderBottom: '1px solid var(--border)',
              }}>
              <Avatar initials={initialsOf(c.title ?? 'CV')} size={42} yellow={isPin} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: isPin ? '#F2C400' : 'var(--text-1)' }}>{convTitle(c)}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-2)' }}>{c.last_message ?? 'Aucun message'}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  const ConvView = () => (
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
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
          messages.map((msg) => {
            const isMe = msg.sender_id === profile?.id
            const senderName = (msg.sender as { name?: string } | null)?.name ?? ''
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'items-end gap-2'}`}>
                {!isMe && <Avatar initials={initialsOf(senderName)} size={28} />}
                <div className="max-w-[78%]">
                  {!isMe && <p className="text-[10px] font-bold mb-1 ml-1" style={{ color: 'var(--text-2)' }}>{senderName}</p>}
                  <div className="rounded-2xl px-4 py-3"
                    style={{
                      background: isMe ? '#F2C400' : 'var(--surface3)',
                      color: isMe ? '#0E0E0D' : 'var(--text-1)',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
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
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'var(--surface2)' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message…" className="flex-1 bg-transparent text-sm outline-none py-1" style={{ color: 'var(--text-1)' }} />
            <button onClick={handleSend} disabled={sending || !input.trim()}
              className="w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
              style={{ background: input.trim() ? '#F2C400' : 'var(--surface3)', color: input.trim() ? '#0E0E0D' : 'var(--text-2)' }}>
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

      <div className="md:hidden" style={{ height: 'calc(100dvh - 7rem)' }}>
        {mobileView === 'list' ? <ConvList /> : <ConvView />}
      </div>
      <div className="hidden md:flex" style={{ height: 'calc(100vh - 3.5rem)' }}>
        <div className="w-80 shrink-0 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border)' }}>
          <ConvList />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <ConvView />
        </div>
      </div>
    </>
  )
}
