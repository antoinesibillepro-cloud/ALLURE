import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BtnPrimary } from '../components/ui'
import { useApp } from '../context/AppContext'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthScreen() {
  const { refreshProfile } = useApp()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setResetSent(true)
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.user) throw new Error("Compte créé — vérifie ta boîte mail pour confirmer l'inscription.")

        // The invite code identifies which club + role to join. Resolved via a
        // lookup RPC so the anon key never needs broad read access to clubs.
        const { error: rpcError } = await supabase.rpc('join_club_with_invite', {
          invite_code: inviteCode.trim(),
          display_name: name,
        })
        if (rpcError) throw rpcError
        await refreshProfile()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m: Mode) {
    setMode(m); setError(null); setResetSent(false)
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
          {mode !== 'forgot' && (
            <div className="flex p-0.5 rounded-xl mb-5" style={{ background: 'var(--surface2)' }}>
              {(['login', 'signup'] as Mode[]).map((m) => (
                <button key={m} type="button" onClick={() => switchMode(m)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: mode === m ? '#F2C400' : 'transparent',
                    color: mode === m ? '#0E0E0D' : 'var(--text-2)',
                  }}>
                  {m === 'login' ? 'Connexion' : 'Inscription'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-5">
              <button type="button" onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Retour à la connexion
              </button>
              <p className="text-lg font-black mt-3" style={{ color: 'var(--text-1)' }}>Mot de passe oublié</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                Entre ton email, on t'envoie un lien pour choisir un nouveau mot de passe.
              </p>
            </div>
          )}

          {mode === 'forgot' && resetSent ? (
            <div className="rounded-[12px] px-3 py-3 text-sm" style={{ background: 'rgba(94,186,101,0.12)', color: '#5EBA65' }}>
              Email envoyé à {email} — vérifie ta boîte mail (et les spams).
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>Nom</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>Email</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              </div>
              {mode !== 'forgot' && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>Mot de passe</label>
                  <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                </div>
              )}
              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')}
                  className="text-xs font-semibold" style={{ color: '#F2C400' }}>
                  Mot de passe oublié ?
                </button>
              )}
              {mode === 'signup' && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-2)' }}>Code d'invitation club</label>
                  <input required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Fourni par ton coach"
                    className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
                </div>
              )}

              {error && (
                <p className="text-xs rounded-[10px] px-3 py-2" style={{ background: 'rgba(228,87,74,0.12)', color: '#E4574A' }}>
                  {error}
                </p>
              )}

              <BtnPrimary className="w-full mt-2" disabled={loading}>
                {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : mode === 'forgot' ? 'Envoyer le lien' : "S'inscrire"}
              </BtnPrimary>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
