import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. ' +
      'O sistema vai rodar em modo local (localStorage) até você configurar o .env.'
  )
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : (null as unknown as ReturnType<typeof createClient>)
