import { useState, useRef, useEffect } from 'react'
import { Avatar, IconSearch } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchConversations, fetchMessages, sendMessage, subscribeToConversation, leaveConversation, markConversationRead, type ConversationSummary } from '../lib/queries/messages'

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function MessagingScreen() {
  const { profile } = useApp()
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'conv'>('list')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [menuForId, setMenuForId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const { data: conversations, refetch: refetchConvs } = useQuery<ConversationSummary[]>(
    () => (profile ? fetchConversations(profile.id, profile.club_id) : Promise.resolve([])),
    [profile?.id],
  )

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

  // Full viewport lock on mobile: without this, iOS Safari scrolls the whole
  // document (not just the message list) to keep a focused input visible
  // above the keyboard, pushing the header off-screen. position:fixed inset:0
  // on the mobile wrapper removes the document scroll entirely.
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
  const canWrite = !isAnnouncement || profile?.role === 'coach'
  const canDelete = activeConv?.kind !== 'announcement'

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

  function convTitle(c: ConversationSummary) {
    if (c.title) return c.title
    return c.kind === 'group' ? 'Groupe' : 'Conversation'
  }

  const convList = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 pb-0 shrink-0">
        <h2 className="text-xl font-black mb-3 md:hidden" style={{ color: 'var(--text-1)' }}>Messagerie</h2>
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
          <IconSearch />
          <input placeholder="Rechercher..." className="bg-transparent text-sm outline-none flex-1"
            style={{ color: 'var(--text-1)' }} />
        </div>
      </div>

      {!!conversations?.length && (
        <div className="flex gap-3 px-4 pt-4 pb-1 overflow-x-auto shrink-0">
          {conversations.map((c) => {
            const pinned = c.kind === 'announcement'
            return (
              <button key={c.id} onClick={() => { setActiveConvId(c.id); setMobileView('conv') }}
                className="flex flex-col items-center gap-1.5 shrink-0 w-14 transition-transform active:scale-95">
                <div style={{ outline: activeConvId === c.id ? '2px solid #F2C400' : 'none', outlineOffset: 2, borderRadius: '9999px', transition: 'outline 0.15s ease' }}>
                  <Avatar initials={initialsOf(c.title ?? 'CV')} size={48} yellow={pinned} />
                </div>
                <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--text-2)' }}>{convTitle(c).split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Conversations</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!conversations?.length && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-2)' }}>Aucune conversation pour l&apos;instant.</p>
        )}
        {conversations?.map((c) => {
          const pinned = c.kind === 'announcement'
          return (
            <div key={c.id} className="relative w-full flex items-center gap-3 px-4 py-3.5 transition-colors"
              style={{
                borderBottom: `1px solid ${pinned ? 'rgba(242,196,0,0.1)' : 'var(--border)'}`,
                background: activeConvId === c.id ? (pinned ? 'rgba(242,196,0,0.06)' : 'var(--surface2)') : pinned ? 'rgba(242,196,0,0.03)' : 'transparent',
              }}>
              <button onClick={() => { setActiveConvId(c.id); setMobileView('conv') }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <Avatar initials={initialsOf(c.title ?? 'CV')} size={44} yellow={pinned} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: pinned ? '#F2C400' : 'var(--text-1)' }}>{convTitle(c)}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-2)' }}>{c.last_message ?? 'Aucun message'}</p>
                </div>
              </button>
              {c.kind !== 'announcement' && (
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
      </div>
    </div>
  )

  const convView = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <button className="md:hidden w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-90"
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
              {isAnnouncement && <p className="text-xs text-[#F2C400]">Annonce · {profile?.role === 'coach' ? 'Visible par tout le club' : 'Lecture seule'}</p>}
            </div>
            {canDelete && (
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5" style={{ background: 'var(--bg)' }}>
        {!activeConv ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-2)' }}>
            Sélectionne une conversation
          </div>
        ) : !messages?.length ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-2)' }}>
            Aucun message pour le moment
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
                  {!isMe && !sameSenderAsPrev && (
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-2)' }}>{senderName}</span>
                    </div>
                  )}
                  <div className="px-4 py-2.5"
                    style={{
                      background: isMe ? '#F2C400' : 'var(--surface3)',
                      color: isMe ? '#0E0E0D' : 'var(--text-1)',
                      borderRadius: isMe ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    }}>
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'justify-end' : 'ml-1'}`}>
                    <p className="text-[9px]" style={{ color: 'var(--text-2)' }}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      {activeConv && (canWrite ? (
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
          <div className="flex items-center gap-2 rounded-full px-3 py-2" style={{ background: 'var(--surface2)' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message..." className="flex-1 bg-transparent text-sm outline-none py-1"
              style={{ color: 'var(--text-1)' }} />
            <button onClick={handleSend} disabled={sending || !input.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
              style={{ background: input.trim() ? '#F2C400' : 'var(--surface3)', color: input.trim() ? '#0E0E0D' : 'var(--text-2)', transform: input.trim() ? 'scale(1)' : 'scale(0.92)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12.5 7L1.5 1.5L4 7L1.5 12.5L12.5 7Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-2)' }}>Annonces publiées par les coaches uniquement</p>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <style>{`@keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="md:hidden fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg)', paddingBottom: '5.5rem' }}>
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
