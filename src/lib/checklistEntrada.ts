import { supabase, supabaseConfigured } from './supabase'
import { limparTextoOuNull } from './sanitize'
import type { ChecklistEntrada, ChecklistEntradaItem, StatusItemChecklistEntrada } from '@/types/database'
import { ITENS_CHECKLIST_ENTRADA_PADRAO } from '@/types/database'

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
function uuid() {
  return crypto.randomUUID()
}
function nowIso() {
  return new Date().toISOString()
}

// Garante que o cabeçalho + os itens padrão existam pra essa OS.
// Chamado sempre que a seção é aberta pela primeira vez — idempotente.
export async function garantirChecklistEntrada(osId: string): Promise<void> {
  const existente = await getChecklistEntrada(osId)
  if (existente) return

  if (supabaseConfigured) {
    const { error: e1 } = await supabase.from('checklist_entrada').insert({ os_id: osId })
    if (e1) throw e1
    const itens = ITENS_CHECKLIST_ENTRADA_PADRAO.map((item, ordem) => ({ os_id: osId, item, ordem }))
    const { error: e2 } = await supabase.from('checklist_entrada_itens').insert(itens)
    if (e2) throw e2
    return
  }

  const cabecalhos = lsGet<ChecklistEntrada[]>('checklist_entrada', [])
  cabecalhos.push({
    id: uuid(),
    os_id: osId,
    observacoes_gerais: null,
    assinatura_url: null,
    concluido_em: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  })
  lsSet('checklist_entrada', cabecalhos)

  const itens = lsGet<ChecklistEntradaItem[]>('checklist_entrada_itens', [])
  ITENS_CHECKLIST_ENTRADA_PADRAO.forEach((item, ordem) => {
    itens.push({
      id: uuid(),
      os_id: osId,
      item,
      ordem,
      status: null,
      observacao: null,
      foto_url: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
  })
  lsSet('checklist_entrada_itens', itens)
}

export async function getChecklistEntrada(osId: string): Promise<ChecklistEntrada | null> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('checklist_entrada').select('*').eq('os_id', osId).maybeSingle()
    if (error) throw error
    return data as ChecklistEntrada | null
  }
  return lsGet<ChecklistEntrada[]>('checklist_entrada', []).find((c) => c.os_id === osId) || null
}

export async function listChecklistEntradaItens(osId: string): Promise<ChecklistEntradaItem[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('checklist_entrada_itens')
      .select('*')
      .eq('os_id', osId)
      .order('ordem')
    if (error) throw error
    return data as ChecklistEntradaItem[]
  }
  return lsGet<ChecklistEntradaItem[]>('checklist_entrada_itens', [])
    .filter((i) => i.os_id === osId)
    .sort((a, b) => a.ordem - b.ordem)
}

export async function atualizarItemChecklistEntrada(
  itemId: string,
  dados: { status?: StatusItemChecklistEntrada; observacao?: string; foto_url?: string }
): Promise<void> {
  const payload = { ...dados, observacao: dados.observacao !== undefined ? limparTextoOuNull(dados.observacao) : undefined }
  if (supabaseConfigured) {
    const { error } = await supabase.from('checklist_entrada_itens').update(payload).eq('id', itemId)
    if (error) throw error
    return
  }
  const itens = lsGet<ChecklistEntradaItem[]>('checklist_entrada_itens', [])
  const idx = itens.findIndex((i) => i.id === itemId)
  if (idx >= 0) {
    itens[idx] = { ...itens[idx], ...payload, updated_at: nowIso() } as ChecklistEntradaItem
    lsSet('checklist_entrada_itens', itens)
  }
}

export async function salvarObservacoesGeraisChecklist(osId: string, texto: string): Promise<void> {
  const payload = { observacoes_gerais: limparTextoOuNull(texto) }
  if (supabaseConfigured) {
    const { error } = await supabase.from('checklist_entrada').update(payload).eq('os_id', osId)
    if (error) throw error
    return
  }
  const cabecalhos = lsGet<ChecklistEntrada[]>('checklist_entrada', [])
  const idx = cabecalhos.findIndex((c) => c.os_id === osId)
  if (idx >= 0) {
    cabecalhos[idx] = { ...cabecalhos[idx], ...payload, updated_at: nowIso() }
    lsSet('checklist_entrada', cabecalhos)
  }
}

export async function salvarAssinaturaChecklist(osId: string, assinaturaUrl: string): Promise<void> {
  const payload = { assinatura_url: assinaturaUrl, concluido_em: nowIso() }
  if (supabaseConfigured) {
    const { error } = await supabase.from('checklist_entrada').update(payload).eq('os_id', osId)
    if (error) throw error
    return
  }
  const cabecalhos = lsGet<ChecklistEntrada[]>('checklist_entrada', [])
  const idx = cabecalhos.findIndex((c) => c.os_id === osId)
  if (idx >= 0) {
    cabecalhos[idx] = { ...cabecalhos[idx], ...payload, updated_at: nowIso() }
    lsSet('checklist_entrada', cabecalhos)
  }
}
