import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { sendEmail, welcomeEmailHtml } from '../_lib/email.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const callerId = await profileIdFromAuthHeader(req.headers.authorization)
  if (!callerId) return res.status(401).json({ error: 'Unauthorized' })

  const admin = supabaseAdmin()
  const { data: caller, error: callerErr } = await admin
    .from('profiles')
    .select('role, club_id')
    .eq('id', callerId)
    .single()
  if (callerErr || !caller || caller.role !== 'coach') return res.status(403).json({ error: 'Réservé aux coaches' })

  const { email, password, name, role, groupId, sendWelcomeEmail } = req.body as {
    email?: string; password?: string; name?: string; role?: 'athlete' | 'coach'; groupId?: string | null; sendWelcomeEmail?: boolean
  }
  if (!email || !password || !name || (role !== 'athlete' && role !== 'coach')) {
    return res.status(400).json({ error: 'Champs manquants' })
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (createErr || !created.user) return res.status(400).json({ error: createErr?.message ?? 'Échec de la création du compte' })

  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id, club_id: caller.club_id, role, name, email,
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return res.status(400).json({ error: profileErr.message })
  }

  if (role === 'athlete' && groupId) {
    await admin.from('group_members').insert({ group_id: groupId, profile_id: created.user.id })
  }

  let emailError: string | null = null
  if (sendWelcomeEmail) {
    const { data: club } = await admin.from('clubs').select('name').eq('id', caller.club_id).single()
    const appUrl = `https://${req.headers.host}`
    try {
      await sendEmail(email, `Bienvenue chez ${club?.name ?? 'ton club'} — accès à ALLURE`, welcomeEmailHtml(name, club?.name ?? 'ton club', email, password, appUrl))
    } catch (e) {
      emailError = e instanceof Error ? e.message : 'Échec de l\'envoi de l\'email'
    }
  }

  return res.status(200).json({ id: created.user.id, emailError })
}
