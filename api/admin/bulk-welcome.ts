import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { sendEmail, welcomeEmailHtml } from '../_lib/email.js'

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

/** Sets a fresh default password and emails the credentials to every athlete of the coach's club who has never logged in yet. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const callerId = await profileIdFromAuthHeader(req.headers.authorization)
  if (!callerId) return res.status(401).json({ error: 'Unauthorized' })

  const admin = supabaseAdmin()
  const { data: caller, error: callerErr } = await admin.from('profiles').select('role, club_id').eq('id', callerId).single()
  if (callerErr || !caller || caller.role !== 'coach') return res.status(403).json({ error: 'Réservé aux coaches' })

  const { data: club } = await admin.from('clubs').select('name').eq('id', caller.club_id).single()
  const { data: athletes, error: athletesErr } = await admin
    .from('profiles')
    .select('id, name, email')
    .eq('club_id', caller.club_id)
    .eq('role', 'athlete')
  if (athletesErr) return res.status(400).json({ error: athletesErr.message })
  if (!athletes?.length) return res.status(200).json({ targeted: 0, sent: 0, failed: 0 })

  const athleteIds = new Set(athletes.map((a) => a.id))
  const neverLoggedIn = new Set<string>()
  let page = 1
  for (;;) {
    const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (listErr) return res.status(400).json({ error: listErr.message })
    for (const u of usersPage.users) {
      if (athleteIds.has(u.id) && !u.last_sign_in_at) neverLoggedIn.add(u.id)
    }
    if (usersPage.users.length < 1000) break
    page++
  }

  const targets = athletes.filter((a) => neverLoggedIn.has(a.id))
  const appUrl = `https://${req.headers.host}`
  let sent = 0
  let failed = 0
  for (const a of targets) {
    try {
      const password = randomPassword()
      const { error: pwErr } = await admin.auth.admin.updateUserById(a.id, { password })
      if (pwErr) throw pwErr
      await sendEmail(a.email, `Bienvenue chez ${club?.name ?? 'ton club'} — accès à ALLURE`, welcomeEmailHtml(a.name, club?.name ?? 'ton club', a.email, password, appUrl))
      sent++
    } catch {
      failed++
    }
  }

  return res.status(200).json({ targeted: targets.length, sent, failed })
}
