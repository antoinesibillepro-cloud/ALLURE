const FROM = 'ALLURE <onboarding@resend.dev>'

export async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error (${res.status}): ${body}`)
  }
  return res.json()
}

export function welcomeEmailHtml(name: string, clubName: string, email: string, password: string, appUrl: string) {
  return `
  <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0E0E0D; color: #fff;">
    <div style="width: 40px; height: 40px; background: #F2C400; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
      <span style="font-weight: 900; color: #0E0E0D; font-size: 20px; line-height: 40px; text-align: center; display: block;">A</span>
    </div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Bienvenue chez ${clubName} !</h1>
    <p style="color: #9C9A92; font-size: 14px; line-height: 1.6;">
      ${name}, ton coach vient de créer ton compte sur ALLURE, l'application de suivi d'entraînement du club.
      Tu peux dès maintenant y accéder pour consulter tes séances, valider tes entraînements et suivre tes statistiques.
    </p>
    <div style="background: #1B1B19; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 4px; font-size: 12px; color: #9C9A92; text-transform: uppercase; letter-spacing: 0.05em;">Identifiants de connexion</p>
      <p style="margin: 0; font-size: 14px; font-family: monospace;">Email : ${email}</p>
      <p style="margin: 4px 0 0; font-size: 14px; font-family: monospace;">Mot de passe : ${password}</p>
    </div>
    <p style="color: #9C9A92; font-size: 12px; line-height: 1.6;">
      Nous te recommandons de changer ce mot de passe depuis ton profil après ta première connexion.
    </p>
    <a href="${appUrl}" style="display: inline-block; margin-top: 16px; background: #F2C400; color: #0E0E0D; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none;">
      Ouvrir ALLURE
    </a>
  </div>`
}
