import { supabase, supabaseConfigured } from './supabase'
import type { LogSistema } from '@/types/database'

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('oficina_' + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function lsSet<T>(key: string, value: T) {
  localStorage.setItem('oficina_' + key, JSON.stringify(value))
}

export async function registrarLogSistema(
  categoria: LogSistema['categoria'],
  acao: string,
  detalhe?: string,
  usuarioNome?: string | null
): Promise<void> {
  const entrada = { usuario_nome: usuarioNome || null, categoria, acao, detalhe: detalhe || null }
  if (supabaseConfigured) {
    const { error } = await supabase.from('logs_sistema').insert(entrada)
    if (error) console.error('Falha ao registrar log:', error)
    return
  }
  const logs = lsGet<LogSistema[]>('logs_sistema', [])
  logs.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...entrada })
  // Mantém só os últimos 500 registros no modo local, pra não crescer sem limite
  lsSet('logs_sistema', logs.slice(-500))
}

export async function listLogsSistema(limit = 100): Promise<LogSistema[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('logs_sistema')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as LogSistema[]
  }
  return lsGet<LogSistema[]>('logs_sistema', [])
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}
