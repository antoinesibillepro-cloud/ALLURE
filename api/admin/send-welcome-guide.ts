import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, profileIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { sendEmail, welcomeWithGuideEmailHtml } from '../_lib/email.js'
import { GUIDE_PDF_BASE64 } from '../_lib/assets/guidePdfBase64.js'

const SHARED_PASSWORD = 'APPCOACH123'

/** Sets a shared default password and emails welcome credentials + the PDF guide to the chosen members. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const callerId = await profileIdFromAuthHeader(req.headers.authorization)
  if (!callerId) return res.status(401).json({ error: 'Unauthorized' })

  const admin = supabaseAdmin()
  const { data: caller, error: callerErr } = await admin.from('profiles').select('role, club_id').eq('id', callerId).single()
  if (callerErr || !caller || caller.role !== 'coach') return res.status(403).json({ error: 'Réservé aux coaches' })

  const { profileIds } = req.body as { profileIds?: string[] }
  if (!profileIds?.length) return res.status(400).json({ error: 'Aucun destinataire' })

  const { data: club } = await admin.from('clubs').select('name').eq('id', caller.club_id).single()
  const { data: targets, error: targetsErr } = await admin
    .from('profiles')
    .select('id, name, email, club_id')
    .in('id', profileIds)
  if (targetsErr) return res.status(400).json({ error: targetsErr.message })

  const inClub = (targets ?? []).filter((t) => t.club_id === caller.club_id)
  const appUrl = `https://${req.headers.host}`

  let sent = 0
  let failed = 0
  for (const t of inClub) {
    try {
      const { error: pwErr } = await admin.auth.admin.updateUserById(t.id, { password: SHARED_PASSWORD })
      if (pwErr) throw pwErr
      await sendEmail(
        t.email,
        `Bienvenue chez ${club?.name ?? 'ton club'} — accès à ALLURE`,
        welcomeWithGuideEmailHtml(t.name, club?.name ?? 'ton club', t.email, SHARED_PASSWORD, appUrl),
        [{ filename: 'guide-allure.pdf', content: GUIDE_PDF_BASE64 }],
      )
      sent++
    } catch {
      failed++
    }
  }

  return res.status(200).json({ targeted: inClub.length, sent, failed })
}
