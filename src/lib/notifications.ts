import { supabase } from './supabase'

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationSupported()) return 'denied'
  return Notification.requestPermission()
}

export function fireNotification(title: string, body: string) {
  if (!notificationSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png' })
  } catch {
    // Some browsers (older Safari) throw when constructing Notification directly; ignore.
  }
}

/**
 * Subscribes to new messages across every conversation the profile belongs to
 * (announcements included) and fires a browser notification for messages not
 * sent by the profile itself. Returns an unsubscribe function.
 */
export function subscribeToOwnMessages(
  profileId: string,
  conversationIds: string[],
  onNewMessage: (payload: { conversationId: string; senderId: string; body: string }) => void,
) {
  if (conversationIds.length === 0) return () => {}
  const channel = supabase
    .channel(`own-messages:${profileId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const row = payload.new as { conversation_id: string; sender_id: string; body: string }
        if (row.sender_id === profileId) return
        if (!conversationIds.includes(row.conversation_id)) return
        onNewMessage({ conversationId: row.conversation_id, senderId: row.sender_id, body: row.body })
      },
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
