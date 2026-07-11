import { supabase, supabaseConfigured } from './supabase'
import { registrarLogSistema } from './logs'
import type { Usuario, Role } from '@/types/database'

const SESSION_KEY = 'oficina_sessao_usuario'
const MAX_TENTATIVAS = 5
const BLOQUEIO_MINUTOS = 15

interface TentativaLogin {
  contagem: number
  bloqueadoAte: number | null
}

function chaveTentativas(usuario: string) {
  return `oficina_tentativas_login_${usuario}`
}

function obterTentativas(usuario: string): TentativaLogin {
  try {
    const raw = localStorage.getItem(chaveTentativas(usuario))
    return raw ? JSON.parse(raw) : { contagem: 0, bloqueadoAte: null }
  } catch {
    return { contagem: 0, bloqueadoAte: null }
  }
}

function salvarTentativas(usuario: string, t: TentativaLogin) {
  localStorage.setItem(chaveTentativas(usuario), JSON.stringify(t))
}

export function verificarBloqueio(usuario: string): { bloqueado: boolean; minutosRestantes: number } {
  const t = obterTentativas(usuario.trim().toLowerCase())
  if (t.bloqueadoAte && t.bloqueadoAte > Date.now()) {
    return { bloqueado: true, minutosRestantes: Math.ceil((t.bloqueadoAte - Date.now()) / 60000) }
  }
  return { bloqueado: false, minutosRestantes: 0 }
}

function registrarTentativaFalha(usuario: string) {
  const login = usuario.trim().toLowerCase()
  const t = obterTentativas(login)
  const novaContagem = t.contagem + 1
  const bloqueadoAte = novaContagem >= MAX_TENTATIVAS ? Date.now() + BLOQUEIO_MINUTOS * 60000 : null
  salvarTentativas(login, { contagem: novaContagem, bloqueadoAte })
}

function limparTentativas(usuario: string) {
  localStorage.removeItem(chaveTentativas(usuario.trim().toLowerCase()))
}

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
    await registrarLogSistema('usuario', 'Usuário criado', `@${novo.usuario} (${novo.role})`)
    return data as Usuario
  }
  const usuarios = lsGetUsuarios()
  usuarios.push(novo)
  lsSetUsuarios(usuarios)
  await registrarLogSistema('usuario', 'Usuário criado', `@${novo.usuario} (${novo.role})`)
  return novo
}

export async function redefinirPin(usuarioId: string, novoPin: string): Promise<void> {
  const pinHash = await hashPin(novoPin)
  if (supabaseConfigured) {
    const { error } = await supabase.from('usuarios').update({ pin_hash: pinHash }).eq('id', usuarioId)
    if (error) throw error
    await registrarLogSistema('usuario', 'PIN redefinido', usuarioId)
    return
  }
  const usuarios = lsGetUsuarios()
  const idx = usuarios.findIndex((u) => u.id === usuarioId)
  if (idx >= 0) {
    usuarios[idx].pin_hash = pinHash
    lsSetUsuarios(usuarios)
    await registrarLogSistema('usuario', 'PIN redefinido', usuarios[idx].usuario)
  }
}

export async function atualizarUsuario(usuarioId: string, dados: { nome?: string; role?: Role }): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('usuarios').update(dados).eq('id', usuarioId)
    if (error) throw error
    return
  }
  const usuarios = lsGetUsuarios()
  const idx = usuarios.findIndex((u) => u.id === usuarioId)
  if (idx >= 0) {
    usuarios[idx] = { ...usuarios[idx], ...dados }
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

export async function deleteUsuario(usuarioId: string): Promise<void> {
  const todos = await listUsuariosInterno()
  const alvo = todos.find((u) => u.id === usuarioId)
  const outrosAdminsAtivos = todos.filter((u) => u.id !== usuarioId && u.role === 'admin' && u.ativo)
  if (alvo?.role === 'admin' && alvo.ativo && outrosAdminsAtivos.length === 0) {
    throw new Error('Não é possível excluir: este é o único usuário administrador ativo. Crie outro admin antes de excluir este.')
  }

  if (supabaseConfigured) {
    const { error } = await supabase.from('usuarios').delete().eq('id', usuarioId)
    if (error) throw error
    return
  }
  lsSetUsuarios(lsGetUsuarios().filter((u) => u.id !== usuarioId))
}

export async function autenticar(usuario: string, pin: string): Promise<Usuario | null> {
  const login = usuario.trim().toLowerCase()

  const bloqueio = verificarBloqueio(login)
  if (bloqueio.bloqueado) {
    await registrarLogSistema('login', 'Tentativa bloqueada', `Usuário @${login} — bloqueado por excesso de tentativas`)
    throw new Error(`Muitas tentativas. Tente novamente em ${bloqueio.minutosRestantes} minuto(s).`)
  }

  const pinHash = await hashPin(pin)

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

  if (!encontrado || encontrado.pin_hash !== pinHash) {
    registrarTentativaFalha(login)
    await registrarLogSistema('login', 'Login falhou', `Usuário @${login}`)
    return null
  }

  limparTentativas(login)

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

  await registrarLogSistema('login', 'Login realizado', undefined, encontrado.nome)
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
  const usuario = obterSessao()
  if (usuario) registrarLogSistema('login', 'Logout', undefined, usuario.nome)
  sessionStorage.removeItem(SESSION_KEY)
}
