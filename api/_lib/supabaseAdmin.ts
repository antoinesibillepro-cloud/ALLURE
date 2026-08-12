import { createClient } from '@supabase/supabase-js'

export function supabaseAdmin() {
  return createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Resolves the calling user's profile id from a Supabase access token (Authorization: Bearer <token>). */
export async function profileIdFromAuthHeader(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length)
  const { data, error } = await supabaseAdmin().auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}
