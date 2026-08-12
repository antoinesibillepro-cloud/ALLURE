import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { sendEmail } from '../_lib/email.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const callerId = await profileIdFromAuthHeader(req.headers.authorization)
  if (!callerId) return res.status(401).json({ error: 'Unauthorized' })

  const admin = supabaseAdmin()
  const { data: caller, error: callerErr } = await admin
    .from('profiles')
    .select('role, club_id, name')
    .eq('id', callerId)
    .single()
  if (callerErr || !caller || caller.role !== 'coach') return res.status(403).json({ error: 'Réservé aux coaches' })

  const { to, subject, message } = req.body as { to?: string; subject?: string; message?: string }
  if (!to || !subject || !message) return res.status(400).json({ error: 'Champs manquants' })

  // Only allow sending to addresses that belong to the coach's own club.
  const { data: recipient } = await admin.from('profiles').select('id').eq('email', to.toLowerCase()).eq('club_id', caller.club_id).maybeSingle()
  if (!recipient) return res.status(403).json({ error: "Cette adresse n'appartient pas à un membre du club" })

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0E0E0D; color: #fff;">
      <p style="color: #9C9A92; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">Message de ${caller.name} (coach)</p>
      <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/</g, '&lt;')}</div>
    </div>`

  try {
    await sendEmail(to, subject, html)
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Échec de l\'envoi' })
  }
}
