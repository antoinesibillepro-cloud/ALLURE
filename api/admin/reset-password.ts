import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { sendEmail } from '../_lib/email.js'

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const callerId = await profileIdFromAuthHeader(req.headers.authorization)
  if (!callerId) return res.status(401).json({ error: 'Unauthorized' })

  const admin = supabaseAdmin()
  const { data: caller, error: callerErr } = await admin.from('profiles').select('role, club_id').eq('id', callerId).single()
  if (callerErr || !caller || caller.role !== 'coach') return res.status(403).json({ error: 'Réservé aux coaches' })

  const { profileId } = req.body as { profileId?: string }
  if (!profileId) return res.status(400).json({ error: 'profileId manquant' })

  const { data: target } = await admin.from('profiles').select('id, name, email, club_id').eq('id', profileId).single()
  if (!target || target.club_id !== caller.club_id) return res.status(403).json({ error: "Ce compte n'appartient pas à ton club" })

  const newPassword = randomPassword()
  const { error: updateErr } = await admin.auth.admin.updateUserById(target.id, { password: newPassword })
  if (updateErr) return res.status(400).json({ error: updateErr.message })

  const appUrl = `https://${req.headers.host}`
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0E0E0D; color: #fff;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Nouveau mot de passe</h1>
      <p style="color: #9C9A92; font-size: 14px; line-height: 1.6;">
        ${target.name}, ton coach a réinitialisé ton mot de passe ALLURE. Voici tes nouveaux identifiants :
      </p>
      <div style="background: #1B1B19; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; font-family: monospace;">Email : ${target.email}</p>
        <p style="margin: 4px 0 0; font-size: 14px; font-family: monospace;">Mot de passe : ${newPassword}</p>
      </div>
      <a href="${appUrl}" style="display: inline-block; margin-top: 8px; background: #F2C400; color: #0E0E0D; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none;">
        Se connecter
      </a>
    </div>`

  try {
    await sendEmail(target.email, 'Ton nouveau mot de passe ALLURE', html)
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(200).json({ ok: true, emailError: e instanceof Error ? e.message : "Échec de l'envoi de l'email" })
  }
}
