import { supabase, supabaseConfigured } from './supabase'
import type { Usuario, Role } from '@/types/database'

const SESSION_KEY = 'oficina_sessao_usuario'

// PIN nunca é salvo em texto puro — SHA-256 via Web Crypto (nativo do navegador/Electron)
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function lsGetUsuarios(): Usuario[] {
  try {
    const raw = localStorage.getItem('oficina_usuarios')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function lsSetUsuarios(usuarios: Usuario[]) {
  localStorage.setItem('oficina_usuarios', JSON.stringify(usuarios))
}

// Cria o primeiro admin automaticamente se nenhum usuário existir ainda
export async function garantirAdminInicial(): Promise<Usuario | null> {
  const existentes = await listUsuariosInterno()
  if (existentes.length > 0) return null

  const pinHash = await hashPin('1234')
  const admin: Usuario = {
    id: crypto.randomUUID(),
    nome: 'Administrador',
    usuario: 'admin',
    pin_hash: pinHash,
    role: 'admin',
    mecanico_id: null,
    ativo: true,
    ultimo_acesso: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (supabaseConfigured) {
    const { data, error } = await supabase.from('usuarios').insert(admin).select().single()
    if (error) throw error
    return data as Usuario
  }
  lsSetUsuarios([admin])
  return admin
}

async function listUsuariosInterno(): Promise<Usuario[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('usuarios').select('*')
    if (error) throw error
    return data as Usuario[]
  }
  return lsGetUsuarios()
}

export async function listUsuarios(): Promise<Usuario[]> {
  const usuarios = await listUsuariosInterno()
  return usuarios.sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function criarUsuario(payload: {
  nome: string
  usuario: string
  pin: string
  role: Role
  mecanico_id?: string | null
}): Promise<Usuario> {
  const pinHash = await hashPin(payload.pin)
  const novo: Usuario = {
    id: crypto.randomUUID(),
    nome: payload.nome,
    usuario: payload.usuario.trim().toLowerCase(),
    pin_hash: pinHash,
    role: payload.role,
    mecanico_id: payload.mecanico_id || null,
    ativo: true,
    ultimo_acesso: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (supabaseConfigured) {
    const { data, error } = await supabase.from('usuarios').insert(novo).select().single()
    if (error) throw error
    return data as Usuario
  }
  const usuarios = lsGetUsuarios()
  usuarios.push(novo)
  lsSetUsuarios(usuarios)
  return novo
}

export async function redefinirPin(usuarioId: string, novoPin: string): Promise<void> {
  const pinHash = await hashPin(novoPin)
  if (supabaseConfigured) {
    const { error } = await supabase.from('usuarios').update({ pin_hash: pinHash }).eq('id', usuarioId)
    if (error) throw error
    return
  }
  const usuarios = lsGetUsuarios()
  const idx = usuarios.findIndex((u) => u.id === usuarioId)
  if (idx >= 0) {
    usuarios[idx].pin_hash = pinHash
    lsSetUsuarios(usuarios)
  }
}

export async function alterarStatusUsuario(usuarioId: string, ativo: boolean): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('usuarios').update({ ativo }).eq('id', usuarioId)
    if (error) throw error
    return
  }
  const usuarios = lsGetUsuarios()
  const idx = usuarios.findIndex((u) => u.id === usuarioId)
  if (idx >= 0) {
    usuarios[idx].ativo = ativo
    lsSetUsuarios(usuarios)
  }
}

export async function autenticar(usuario: string, pin: string): Promise<Usuario | null> {
  const pinHash = await hashPin(pin)
  const login = usuario.trim().toLowerCase()

  let encontrado: Usuario | undefined

  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', login)
      .eq('ativo', true)
      .maybeSingle()
    if (error) throw error
    encontrado = data as Usuario | undefined
  } else {
    encontrado = lsGetUsuarios().find((u) => u.usuario === login && u.ativo)
  }

  if (!encontrado || encontrado.pin_hash !== pinHash) return null

  // Atualiza último acesso (best-effort, não bloqueia o login se falhar)
  try {
    if (supabaseConfigured) {
      await supabase.from('usuarios').update({ ultimo_acesso: new Date().toISOString() }).eq('id', encontrado.id)
    } else {
      const usuarios = lsGetUsuarios()
      const idx = usuarios.findIndex((u) => u.id === encontrado!.id)
      if (idx >= 0) {
        usuarios[idx].ultimo_acesso = new Date().toISOString()
        lsSetUsuarios(usuarios)
      }
    }
  } catch {
    // não crítico
  }

  salvarSessao(encontrado)
  return encontrado
}

export function salvarSessao(usuario: Usuario) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(usuario))
}

export function obterSessao(): Usuario | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function encerrarSessao() {
  sessionStorage.removeItem(SESSION_KEY)
}
