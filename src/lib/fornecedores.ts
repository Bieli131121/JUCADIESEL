import { supabase, supabaseConfigured } from './supabase'
import { limparTexto, limparTextoOuNull } from './sanitize'
import { registrarEntradaEstoque } from './db'
import type { Fornecedor, OrdemCompra, OrdemCompraItem, StatusOrdemCompra } from '@/types/database'

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

// ---------- FORNECEDORES ----------

export async function listFornecedores(): Promise<Fornecedor[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('fornecedores').select('*').eq('ativo', true).order('nome')
    if (error) throw error
    return data as Fornecedor[]
  }
  return lsGet<Fornecedor[]>('fornecedores', []).filter((f) => f.ativo)
}

export async function listTodosFornecedores(): Promise<Fornecedor[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('fornecedores').select('*').order('nome')
    if (error) throw error
    return data as Fornecedor[]
  }
  return lsGet<Fornecedor[]>('fornecedores', []).sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function upsertFornecedor(fornecedor: Partial<Fornecedor>): Promise<Fornecedor> {
  const payload = {
    ...fornecedor,
    nome: fornecedor.nome ? limparTexto(fornecedor.nome) : fornecedor.nome,
    observacoes: limparTextoOuNull(fornecedor.observacoes),
  }
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('fornecedores').upsert(payload).select().single()
    if (error) throw error
    return data as Fornecedor
  }
  const fornecedores = lsGet<Fornecedor[]>('fornecedores', [])
  if (payload.id) {
    const idx = fornecedores.findIndex((f) => f.id === payload.id)
    fornecedores[idx] = { ...fornecedores[idx], ...payload, updated_at: nowIso() } as Fornecedor
    lsSet('fornecedores', fornecedores)
    return fornecedores[idx]
  }
  const novo: Fornecedor = {
    id: uuid(),
    nome: payload.nome || '',
    cnpj: payload.cnpj || null,
    telefone: payload.telefone || null,
    email: payload.email || null,
    contato: payload.contato || null,
    prazo_pagamento_dias: payload.prazo_pagamento_dias || null,
    observacoes: payload.observacoes || null,
    ativo: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  fornecedores.push(novo)
  lsSet('fornecedores', fornecedores)
  return novo
}

export async function alterarStatusFornecedor(id: string, ativo: boolean): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('fornecedores').update({ ativo }).eq('id', id)
    if (error) throw error
    return
  }
  const fornecedores = lsGet<Fornecedor[]>('fornecedores', [])
  const idx = fornecedores.findIndex((f) => f.id === id)
  if (idx >= 0) {
    fornecedores[idx].ativo = ativo
    lsSet('fornecedores', fornecedores)
  }
}

export async function deleteFornecedor(id: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir: este fornecedor já está vinculado a peças ou ordens de compra. Considere desativar em vez de excluir.')
      }
      throw error
    }
    return
  }
  const usadoEmPeca = lsGet<{ fornecedor_id: string | null }[]>('pecas', []).some((p) => p.fornecedor_id === id)
  const usadoEmCompra = lsGet<{ fornecedor_id: string | null }[]>('ordens_compra', []).some((o) => o.fornecedor_id === id)
  if (usadoEmPeca || usadoEmCompra) {
    throw new Error('Não é possível excluir: este fornecedor já está vinculado a peças ou ordens de compra. Considere desativar em vez de excluir.')
  }
  lsSet('fornecedores', lsGet<Fornecedor[]>('fornecedores', []).filter((f) => f.id !== id))
}

// ---------- ORDENS DE COMPRA ----------

export async function listOrdensCompra(): Promise<OrdemCompra[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('ordens_compra')
      .select('*, fornecedor:fornecedores(*)')
      .order('numero', { ascending: false })
    if (error) throw error
    return data as OrdemCompra[]
  }
  const ordens = lsGet<OrdemCompra[]>('ordens_compra', [])
  const fornecedores = lsGet<Fornecedor[]>('fornecedores', [])
  return ordens
    .map((o) => ({ ...o, fornecedor: fornecedores.find((f) => f.id === o.fornecedor_id) }))
    .sort((a, b) => b.numero - a.numero)
}

export async function getOrdemCompra(id: string): Promise<OrdemCompra | null> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('ordens_compra')
      .select('*, fornecedor:fornecedores(*), itens:ordens_compra_itens(*, peca:pecas(*))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as OrdemCompra
  }
  const ordens = lsGet<OrdemCompra[]>('ordens_compra', [])
  const ordem = ordens.find((o) => o.id === id)
  if (!ordem) return null
  const fornecedores = lsGet<Fornecedor[]>('fornecedores', [])
  const pecas = lsGet<any[]>('pecas', [])
  const itens = lsGet<OrdemCompraItem[]>('ordens_compra_itens', [])
    .filter((i) => i.ordem_compra_id === id)
    .map((i) => ({ ...i, peca: pecas.find((p) => p.id === i.peca_id) }))
  return { ...ordem, fornecedor: fornecedores.find((f) => f.id === ordem.fornecedor_id), itens }
}

export async function criarOrdemCompra(fornecedorId: string, observacoes?: string): Promise<OrdemCompra> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('ordens_compra')
      .insert({ fornecedor_id: fornecedorId, observacoes: limparTextoOuNull(observacoes), status: 'rascunho' })
      .select()
      .single()
    if (error) throw error
    return data as OrdemCompra
  }
  const ordens = lsGet<OrdemCompra[]>('ordens_compra', [])
  const proximoNumero = ordens.reduce((max, o) => Math.max(max, o.numero), 2000) + 1
  const nova: OrdemCompra = {
    id: uuid(),
    numero: proximoNumero,
    fornecedor_id: fornecedorId,
    status: 'rascunho',
    valor_total: 0,
    observacoes: limparTextoOuNull(observacoes),
    data_envio: null,
    data_recebimento: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  ordens.push(nova)
  lsSet('ordens_compra', ordens)
  return nova
}

export async function adicionarItemOrdemCompra(item: {
  ordem_compra_id: string
  peca_id: string | null
  descricao: string
  quantidade: number
  preco_unitario: number
}): Promise<void> {
  const payload = { ...item, descricao: limparTexto(item.descricao) }
  if (supabaseConfigured) {
    const { error } = await supabase.from('ordens_compra_itens').insert(payload)
    if (error) throw error
    return
  }
  const itens = lsGet<OrdemCompraItem[]>('ordens_compra_itens', [])
  itens.push({
    id: uuid(),
    ordem_compra_id: payload.ordem_compra_id,
    peca_id: payload.peca_id,
    descricao: payload.descricao,
    quantidade: payload.quantidade,
    preco_unitario: payload.preco_unitario,
    valor_total: payload.quantidade * payload.preco_unitario,
    created_at: nowIso(),
  })
  lsSet('ordens_compra_itens', itens)
  recalcularValorOrdemCompraLocal(payload.ordem_compra_id)
}

export async function removerItemOrdemCompra(itemId: string, ordemCompraId: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('ordens_compra_itens').delete().eq('id', itemId)
    if (error) throw error
    return
  }
  const itens = lsGet<OrdemCompraItem[]>('ordens_compra_itens', []).filter((i) => i.id !== itemId)
  lsSet('ordens_compra_itens', itens)
  recalcularValorOrdemCompraLocal(ordemCompraId)
}

function recalcularValorOrdemCompraLocal(ordemCompraId: string) {
  const itens = lsGet<OrdemCompraItem[]>('ordens_compra_itens', []).filter((i) => i.ordem_compra_id === ordemCompraId)
  const total = itens.reduce((s, i) => s + i.valor_total, 0)
  const ordens = lsGet<OrdemCompra[]>('ordens_compra', [])
  const idx = ordens.findIndex((o) => o.id === ordemCompraId)
  if (idx >= 0) {
    ordens[idx].valor_total = total
    lsSet('ordens_compra', ordens)
  }
}

// Muda status da ordem de compra. Ao marcar como "recebida", dá entrada
// automática no estoque de todos os itens vinculados a uma peça cadastrada.
export async function mudarStatusOrdemCompra(id: string, novoStatus: StatusOrdemCompra): Promise<void> {
  const ordem = await getOrdemCompra(id)
  if (!ordem) return

  if (novoStatus === 'recebida' && ordem.status !== 'recebida') {
    for (const item of ordem.itens || []) {
      if (item.peca_id) {
        await registrarEntradaEstoque(
          item.peca_id,
          item.quantidade,
          `Ordem de compra #${ordem.numero}${ordem.fornecedor ? ' - ' + ordem.fornecedor.nome : ''}`
        )
      }
    }
  }

  const atualizacao: Partial<OrdemCompra> = { status: novoStatus }
  if (novoStatus === 'enviada') atualizacao.data_envio = nowIso()
  if (novoStatus === 'recebida') atualizacao.data_recebimento = nowIso()

  if (supabaseConfigured) {
    const { error } = await supabase.from('ordens_compra').update(atualizacao).eq('id', id)
    if (error) throw error
    return
  }
  const ordens = lsGet<OrdemCompra[]>('ordens_compra', [])
  const idx = ordens.findIndex((o) => o.id === id)
  if (idx >= 0) {
    ordens[idx] = { ...ordens[idx], ...atualizacao, updated_at: nowIso() }
    lsSet('ordens_compra', ordens)
  }
}
