import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BtnPrimary } from '../components/ui'

/** Shown when Supabase detects an opened password-recovery link — lets the user set a new password. */
export default function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('6 caractères minimum.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#F2C400] flex items-center justify-center"
            style={{ boxShadow: '0 3px 10px rgba(242,196,0,0.35)' }}>
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5C6.5 1.5 4 4 4 7.5C4 10.5 5.5 12.5 7.5 13.5L9 16.5L10.5 13.5C12.5 12.5 14 10.5 14 7.5C14 4 11.5 1.5 9 1.5Z" fill="#0E0E0D" />
              <circle cx="9" cy="7.5" r="2" fill="#F2C400" />
            </svg>
          </div>
          <p className="font-black text-lg leading-none tracking-tight" style={{ color: 'var(--text-1)' }}>ALLURE</p>
        </div>

        <div className="rounded-3xl p-6" style={{ background: 'var(--card)', boxShadow: 'var(--card-shadow)' }}>
          <p className="text-lg font-black" style={{ color: 'var(--text-1)' }}>Nouveau mot de passe</p>

          {done ? (
            <>
              <p className="text-sm mt-3 mb-4 rounded-[12px] px-3 py-3" style={{ background: 'rgba(94,186,101,0.12)', color: '#5EBA65' }}>
                Mot de passe mis à jour.
              </p>
              <BtnPrimary className="w-full" onClick={onDone}>Continuer</BtnPrimary>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 mt-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>Nouveau mot de passe</label>
                <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>Confirmer</label>
                <input required type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              </div>

              {error && (
                <p className="text-xs rounded-[10px] px-3 py-2" style={{ background: 'rgba(228,87,74,0.12)', color: '#E4574A' }}>
                  {error}
                </p>
              )}

              <BtnPrimary className="w-full mt-2" disabled={loading}>
                {loading ? 'Chargement…' : 'Mettre à jour'}
              </BtnPrimary>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
