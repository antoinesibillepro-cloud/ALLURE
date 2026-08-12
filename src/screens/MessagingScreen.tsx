import { useState, useRef, useEffect } from 'react'
import { Avatar, IconSearch } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useQuery } from '../lib/useQuery'
import { fetchConversations, fetchMessages, sendMessage, subscribeToConversation, type ConversationSummary } from '../lib/queries/messages'

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function MessagingScreen() {
  const { profile } = useApp()
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'conv'>('list')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
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

  useEffect(() => {
    if (!activeConvId) return
    return subscribeToConversation(activeConvId, () => { refetchMessages(); refetchConvs() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId])

  const isAnnouncement = activeConv?.kind === 'announcement'
  const canWrite = !isAnnouncement || profile?.role === 'coach'

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

  function convTitle(c: ConversationSummary) {
    if (c.title) return c.kind === 'announcement' ? `📢 ${c.title}` : c.title
    return c.kind === 'group' ? 'Groupe' : 'Conversation'
  }

  const ConvList = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 pb-0 shrink-0">
        <h2 className="text-xl font-black mb-3 md:hidden" style={{ color: 'var(--text-1)' }}>Messagerie</h2>
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
          <IconSearch />
          <input placeholder="Rechercher..." className="bg-transparent text-sm outline-none flex-1"
            style={{ color: 'var(--text-1)' }} />
        </div>
      </div>

      <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Conversations</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!conversations?.length && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-2)' }}>Aucune conversation pour l&apos;instant.</p>
        )}
        {conversations?.map((c) => {
          const pinned = c.kind === 'announcement'
          return (
            <button key={c.id} onClick={() => { setActiveConvId(c.id); setMobileView('conv') }}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left"
              style={{
                borderBottom: `1px solid ${pinned ? 'rgba(242,196,0,0.1)' : 'var(--border)'}`,
                background: activeConvId === c.id ? (pinned ? 'rgba(242,196,0,0.06)' : 'var(--surface2)') : pinned ? 'rgba(242,196,0,0.03)' : 'transparent',
              }}>
              <Avatar initials={initialsOf(c.title ?? 'CV')} size={44} yellow={pinned} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: pinned ? '#F2C400' : 'var(--text-1)' }}>{convTitle(c)}</p>
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
        <button className="md:hidden w-8 h-8 rounded-full flex items-center justify-center transition-colors"
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
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!activeConv ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-2)' }}>
            Sélectionne une conversation
          </div>
        ) : !messages?.length ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-2)' }}>
            Aucun message pour le moment
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === profile?.id
            const senderName = (msg.sender as { name?: string } | null)?.name ?? ''
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'items-end gap-2'}`}>
                {!isMe && <Avatar initials={initialsOf(senderName)} size={28} />}
                <div className="max-w-[78%]">
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-2)' }}>{senderName}</span>
                    </div>
                  )}
                  <div className="rounded-2xl px-4 py-3"
                    style={{
                      background: isMe ? '#F2C400' : 'var(--surface3)',
                      color: isMe ? '#0E0E0D' : 'var(--text-1)',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
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
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'var(--surface2)' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message..." className="flex-1 bg-transparent text-sm outline-none py-1"
              style={{ color: 'var(--text-1)' }} />
            <button onClick={handleSend} disabled={sending || !input.trim()}
              className="w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
              style={{ background: input.trim() ? '#F2C400' : 'var(--surface3)', color: input.trim() ? '#0E0E0D' : 'var(--text-2)' }}>
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
