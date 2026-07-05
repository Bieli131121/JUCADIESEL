// Camada de dados única: usa Supabase quando configurado, cai para localStorage
// quando não há .env (ex: primeira instalação do app desktop sem internet).
// As regras de negócio replicadas aqui (baixa de estoque, geração de conta a
// receber) espelham os triggers do schema.sql para manter paridade no modo local.

import { supabase, supabaseConfigured } from './supabase'
import type {
  Cliente,
  Veiculo,
  Peca,
  Mecanico,
  Agendamento,
  OrdemServico,
  OSItem,
  ContaReceber,
  ContaPagar,
  MovimentacaoEstoque,
  EmpresaConfig,
  StatusOS,
} from '@/types/database'

// ---------- helpers localStorage ----------

const LS_PREFIX = 'oficina_'

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet<T>(key: string, value: T) {
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
}

function uuid() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

// ---------- CLIENTES ----------

export async function listClientes(): Promise<Cliente[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('clientes').select('*').order('nome')
    if (error) throw error
    return data as Cliente[]
  }
  return lsGet<Cliente[]>('clientes', []).sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function upsertCliente(cliente: Partial<Cliente>): Promise<Cliente> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('clientes').upsert(cliente).select().single()
    if (error) throw error
    return data as Cliente
  }
  const clientes = lsGet<Cliente[]>('clientes', [])
  if (cliente.id) {
    const idx = clientes.findIndex((c) => c.id === cliente.id)
    clientes[idx] = { ...clientes[idx], ...cliente, updated_at: nowIso() } as Cliente
    lsSet('clientes', clientes)
    return clientes[idx]
  }
  const novo: Cliente = {
    id: uuid(),
    nome: cliente.nome || '',
    cpf_cnpj: cliente.cpf_cnpj || null,
    telefone: cliente.telefone || '',
    email: cliente.email || null,
    endereco: cliente.endereco || null,
    observacoes: cliente.observacoes || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  clientes.push(novo)
  lsSet('clientes', clientes)
  return novo
}

export async function deleteCliente(id: string) {
  if (supabaseConfigured) {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSet('clientes', lsGet<Cliente[]>('clientes', []).filter((c) => c.id !== id))
}

// ---------- VEÍCULOS ----------

export async function listVeiculos(): Promise<Veiculo[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('veiculos')
      .select('*, cliente:clientes(*)')
      .order('placa')
    if (error) throw error
    return data as Veiculo[]
  }
  const veiculos = lsGet<Veiculo[]>('veiculos', [])
  const clientes = lsGet<Cliente[]>('clientes', [])
  return veiculos.map((v) => ({ ...v, cliente: clientes.find((c) => c.id === v.cliente_id) }))
}

export async function upsertVeiculo(veiculo: Partial<Veiculo>): Promise<Veiculo> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('veiculos').upsert(veiculo).select().single()
    if (error) throw error
    return data as Veiculo
  }
  const veiculos = lsGet<Veiculo[]>('veiculos', [])
  if (veiculo.id) {
    const idx = veiculos.findIndex((v) => v.id === veiculo.id)
    veiculos[idx] = { ...veiculos[idx], ...veiculo, updated_at: nowIso() } as Veiculo
    lsSet('veiculos', veiculos)
    return veiculos[idx]
  }
  const novo: Veiculo = {
    id: uuid(),
    cliente_id: veiculo.cliente_id || '',
    placa: (veiculo.placa || '').toUpperCase(),
    marca: veiculo.marca || null,
    modelo: veiculo.modelo || '',
    ano: veiculo.ano || null,
    cor: veiculo.cor || null,
    km_atual: veiculo.km_atual || 0,
    chassi: veiculo.chassi || null,
    observacoes: veiculo.observacoes || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  veiculos.push(novo)
  lsSet('veiculos', veiculos)
  return novo
}

export async function deleteVeiculo(id: string) {
  if (supabaseConfigured) {
    const { error } = await supabase.from('veiculos').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSet('veiculos', lsGet<Veiculo[]>('veiculos', []).filter((v) => v.id !== id))
}

// ---------- PEÇAS / ESTOQUE ----------

export async function listPecas(): Promise<Peca[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('pecas').select('*').order('nome')
    if (error) throw error
    return data as Peca[]
  }
  return lsGet<Peca[]>('pecas', []).sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function upsertPeca(peca: Partial<Peca>): Promise<Peca> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('pecas').upsert(peca).select().single()
    if (error) throw error
    return data as Peca
  }
  const pecas = lsGet<Peca[]>('pecas', [])
  if (peca.id) {
    const idx = pecas.findIndex((p) => p.id === peca.id)
    pecas[idx] = { ...pecas[idx], ...peca, updated_at: nowIso() } as Peca
    lsSet('pecas', pecas)
    return pecas[idx]
  }
  const nova: Peca = {
    id: uuid(),
    nome: peca.nome || '',
    codigo: peca.codigo || null,
    categoria: peca.categoria || null,
    quantidade_estoque: peca.quantidade_estoque || 0,
    estoque_minimo: peca.estoque_minimo ?? 5,
    preco_custo: peca.preco_custo || 0,
    preco_venda: peca.preco_venda || 0,
    fornecedor: peca.fornecedor || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  pecas.push(nova)
  lsSet('pecas', pecas)
  return nova
}

export async function registrarEntradaEstoque(pecaId: string, quantidade: number, motivo = 'Compra fornecedor') {
  if (supabaseConfigured) {
    const { error } = await supabase.rpc('fn_registrar_entrada_estoque', {
      p_peca_id: pecaId,
      p_quantidade: quantidade,
      p_motivo: motivo,
    })
    if (error) throw error
    return
  }
  const pecas = lsGet<Peca[]>('pecas', [])
  const idx = pecas.findIndex((p) => p.id === pecaId)
  if (idx >= 0) {
    pecas[idx].quantidade_estoque += quantidade
    lsSet('pecas', pecas)
  }
  const movs = lsGet<MovimentacaoEstoque[]>('movimentacoes', [])
  movs.push({
    id: uuid(),
    peca_id: pecaId,
    tipo: 'entrada',
    quantidade,
    motivo,
    os_id: null,
    created_at: nowIso(),
  })
  lsSet('movimentacoes', movs)
}

export async function listMovimentacoesEstoque(): Promise<MovimentacaoEstoque[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select('*, peca:pecas(*)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data as MovimentacaoEstoque[]
  }
  const movs = lsGet<MovimentacaoEstoque[]>('movimentacoes', [])
  const pecas = lsGet<Peca[]>('pecas', [])
  return movs
    .map((m) => ({ ...m, peca: pecas.find((p) => p.id === m.peca_id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// ---------- MECÂNICOS ----------

export async function listMecanicos(): Promise<Mecanico[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('mecanicos').select('*').eq('ativo', true).order('nome')
    if (error) throw error
    return data as Mecanico[]
  }
  return lsGet<Mecanico[]>('mecanicos', []).filter((m) => m.ativo)
}

export async function upsertMecanico(mecanico: Partial<Mecanico>): Promise<Mecanico> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('mecanicos').upsert(mecanico).select().single()
    if (error) throw error
    return data as Mecanico
  }
  const mecanicos = lsGet<Mecanico[]>('mecanicos', [])
  if (mecanico.id) {
    const idx = mecanicos.findIndex((m) => m.id === mecanico.id)
    mecanicos[idx] = { ...mecanicos[idx], ...mecanico } as Mecanico
    lsSet('mecanicos', mecanicos)
    return mecanicos[idx]
  }
  const novo: Mecanico = {
    id: uuid(),
    nome: mecanico.nome || '',
    telefone: mecanico.telefone || null,
    ativo: true,
    created_at: nowIso(),
  }
  mecanicos.push(novo)
  lsSet('mecanicos', mecanicos)
  return novo
}

// ---------- ORDENS DE SERVIÇO ----------

export async function listOrdensServico(): Promise<OrdemServico[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*, cliente:clientes(*), veiculo:veiculos(*), mecanico:mecanicos(*)')
      .order('numero', { ascending: false })
    if (error) throw error
    return data as OrdemServico[]
  }
  const os = lsGet<OrdemServico[]>('ordens_servico', [])
  const clientes = lsGet<Cliente[]>('clientes', [])
  const veiculos = lsGet<Veiculo[]>('veiculos', [])
  const mecanicos = lsGet<Mecanico[]>('mecanicos', [])
  return os
    .map((o) => ({
      ...o,
      cliente: clientes.find((c) => c.id === o.cliente_id),
      veiculo: veiculos.find((v) => v.id === o.veiculo_id),
      mecanico: mecanicos.find((m) => m.id === o.mecanico_id),
    }))
    .sort((a, b) => b.numero - a.numero)
}

export async function getOrdemServico(id: string): Promise<OrdemServico | null> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*, cliente:clientes(*), veiculo:veiculos(*), mecanico:mecanicos(*), itens:os_itens(*, peca:pecas(*))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as OrdemServico
  }
  const os = lsGet<OrdemServico[]>('ordens_servico', []).find((o) => o.id === id)
  if (!os) return null
  const clientes = lsGet<Cliente[]>('clientes', [])
  const veiculos = lsGet<Veiculo[]>('veiculos', [])
  const pecas = lsGet<Peca[]>('pecas', [])
  const itens = lsGet<OSItem[]>('os_itens', [])
    .filter((i) => i.os_id === id)
    .map((i) => ({ ...i, peca: pecas.find((p) => p.id === i.peca_id) }))
  return {
    ...os,
    cliente: clientes.find((c) => c.id === os.cliente_id),
    veiculo: veiculos.find((v) => v.id === os.veiculo_id),
    itens,
  }
}

export async function criarOrdemServico(payload: {
  cliente_id: string
  veiculo_id: string
  mecanico_id: string | null
  km_entrada: number | null
  defeito_relatado: string | null
}): Promise<OrdemServico> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .insert({ ...payload, status: 'orcamento' })
      .select()
      .single()
    if (error) throw error
    return data as OrdemServico
  }
  const todas = lsGet<OrdemServico[]>('ordens_servico', [])
  const proximoNumero = todas.reduce((max, o) => Math.max(max, o.numero), 1000) + 1
  const nova: OrdemServico = {
    id: uuid(),
    numero: proximoNumero,
    cliente_id: payload.cliente_id,
    veiculo_id: payload.veiculo_id,
    mecanico_id: payload.mecanico_id,
    status: 'orcamento',
    km_entrada: payload.km_entrada,
    defeito_relatado: payload.defeito_relatado,
    diagnostico: null,
    valor_total: 0,
    data_orcamento: nowIso(),
    data_aprovacao: null,
    data_conclusao: null,
    data_entrega: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  todas.push(nova)
  lsSet('ordens_servico', todas)
  return nova
}

export async function adicionarItemOS(item: {
  os_id: string
  tipo: 'servico' | 'peca'
  peca_id: string | null
  descricao: string
  quantidade: number
  valor_unitario: number
}): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('os_itens').insert(item)
    if (error) throw error
    return
  }
  const itens = lsGet<OSItem[]>('os_itens', [])
  itens.push({
    id: uuid(),
    os_id: item.os_id,
    tipo: item.tipo,
    peca_id: item.peca_id,
    descricao: item.descricao,
    quantidade: item.quantidade,
    valor_unitario: item.valor_unitario,
    valor_total: item.quantidade * item.valor_unitario,
    estoque_baixado: false,
    created_at: nowIso(),
  })
  lsSet('os_itens', itens)
  recalcularValorOSLocal(item.os_id)
}

export async function removerItemOS(itemId: string, osId: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('os_itens').delete().eq('id', itemId)
    if (error) throw error
    return
  }
  const itens = lsGet<OSItem[]>('os_itens', []).filter((i) => i.id !== itemId)
  lsSet('os_itens', itens)
  recalcularValorOSLocal(osId)
}

function recalcularValorOSLocal(osId: string) {
  const itens = lsGet<OSItem[]>('os_itens', []).filter((i) => i.os_id === osId)
  const total = itens.reduce((sum, i) => sum + i.valor_total, 0)
  const todasOS = lsGet<OrdemServico[]>('ordens_servico', [])
  const idx = todasOS.findIndex((o) => o.id === osId)
  if (idx >= 0) {
    todasOS[idx].valor_total = total
    lsSet('ordens_servico', todasOS)
  }
}

// Muda status da OS. No modo Supabase, os triggers do banco cuidam de
// estoque e financeiro. No modo local, replicamos a mesma regra aqui.
export async function mudarStatusOS(osId: string, novoStatus: StatusOS): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('ordens_servico').update({ status: novoStatus }).eq('id', osId)
    if (error) throw error
    return
  }

  const todasOS = lsGet<OrdemServico[]>('ordens_servico', [])
  const idx = todasOS.findIndex((o) => o.id === osId)
  if (idx < 0) return
  const os = todasOS[idx]
  const statusAnterior = os.status

  // Baixa estoque ao aprovar
  if (novoStatus === 'aprovado' && statusAnterior !== 'aprovado') {
    const itens = lsGet<OSItem[]>('os_itens', [])
    const pecas = lsGet<Peca[]>('pecas', [])
    const movs = lsGet<MovimentacaoEstoque[]>('movimentacoes', [])
    itens
      .filter((i) => i.os_id === osId && i.tipo === 'peca' && !i.estoque_baixado)
      .forEach((i) => {
        const pIdx = pecas.findIndex((p) => p.id === i.peca_id)
        if (pIdx >= 0) pecas[pIdx].quantidade_estoque -= i.quantidade
        i.estoque_baixado = true
        movs.push({
          id: uuid(),
          peca_id: i.peca_id as string,
          tipo: 'saida',
          quantidade: i.quantidade,
          motivo: `Baixa OS #${os.numero}`,
          os_id: osId,
          created_at: nowIso(),
        })
      })
    lsSet('pecas', pecas)
    lsSet('os_itens', itens)
    lsSet('movimentacoes', movs)
    os.data_aprovacao = nowIso()
  }

  // Estorna estoque se cancelar depois de já ter baixado
  if (
    novoStatus === 'cancelado' &&
    ['aprovado', 'em_execucao', 'aguardando_peca', 'concluido'].includes(statusAnterior)
  ) {
    const itens = lsGet<OSItem[]>('os_itens', [])
    const pecas = lsGet<Peca[]>('pecas', [])
    const movs = lsGet<MovimentacaoEstoque[]>('movimentacoes', [])
    itens
      .filter((i) => i.os_id === osId && i.tipo === 'peca' && i.estoque_baixado)
      .forEach((i) => {
        const pIdx = pecas.findIndex((p) => p.id === i.peca_id)
        if (pIdx >= 0) pecas[pIdx].quantidade_estoque += i.quantidade
        i.estoque_baixado = false
        movs.push({
          id: uuid(),
          peca_id: i.peca_id as string,
          tipo: 'estorno',
          quantidade: i.quantidade,
          motivo: `Estorno OS #${os.numero}`,
          os_id: osId,
          created_at: nowIso(),
        })
      })
    lsSet('pecas', pecas)
    lsSet('os_itens', itens)
    lsSet('movimentacoes', movs)
  }

  if (novoStatus === 'concluido') os.data_conclusao = nowIso()

  // Gera conta a receber ao entregar
  if (novoStatus === 'entregue' && statusAnterior !== 'entregue') {
    os.data_entrega = nowIso()
    const contas = lsGet<ContaReceber[]>('contas_receber', [])
    contas.push({
      id: uuid(),
      os_id: os.id,
      cliente_id: os.cliente_id,
      descricao: `OS #${os.numero}`,
      valor: os.valor_total,
      status: 'pendente',
      data_vencimento: new Date().toISOString().slice(0, 10),
      data_pagamento: null,
      forma_pagamento: null,
      created_at: nowIso(),
    })
    lsSet('contas_receber', contas)
  }

  os.status = novoStatus
  os.updated_at = nowIso()
  todasOS[idx] = os
  lsSet('ordens_servico', todasOS)
}

// ---------- AGENDAMENTOS ----------

export async function listAgendamentos(): Promise<Agendamento[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, cliente:clientes(*), veiculo:veiculos(*), mecanico:mecanicos(*)')
      .order('data_hora')
    if (error) throw error
    return data as Agendamento[]
  }
  const ags = lsGet<Agendamento[]>('agendamentos', [])
  const clientes = lsGet<Cliente[]>('clientes', [])
  const veiculos = lsGet<Veiculo[]>('veiculos', [])
  return ags
    .map((a) => ({
      ...a,
      cliente: clientes.find((c) => c.id === a.cliente_id),
      veiculo: veiculos.find((v) => v.id === a.veiculo_id),
    }))
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
}

export async function criarAgendamento(payload: Partial<Agendamento>): Promise<Agendamento> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('agendamentos')
      .insert({ ...payload, status: 'agendado' })
      .select()
      .single()
    if (error) throw error
    return data as Agendamento
  }
  const ags = lsGet<Agendamento[]>('agendamentos', [])
  const novo: Agendamento = {
    id: uuid(),
    cliente_id: payload.cliente_id || null,
    veiculo_id: payload.veiculo_id || null,
    mecanico_id: payload.mecanico_id || null,
    data_hora: payload.data_hora || nowIso(),
    descricao: payload.descricao || null,
    status: 'agendado',
    os_id: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  ags.push(novo)
  lsSet('agendamentos', ags)
  return novo
}

export async function atualizarStatusAgendamento(id: string, status: Agendamento['status']) {
  if (supabaseConfigured) {
    const { error } = await supabase.from('agendamentos').update({ status }).eq('id', id)
    if (error) throw error
    return
  }
  const ags = lsGet<Agendamento[]>('agendamentos', [])
  const idx = ags.findIndex((a) => a.id === id)
  if (idx >= 0) {
    ags[idx].status = status
    lsSet('agendamentos', ags)
  }
}

// ---------- FINANCEIRO ----------

export async function listContasReceber(): Promise<ContaReceber[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('contas_receber')
      .select('*, cliente:clientes(*)')
      .order('data_vencimento', { ascending: true })
    if (error) throw error
    return data as ContaReceber[]
  }
  const contas = lsGet<ContaReceber[]>('contas_receber', [])
  const clientes = lsGet<Cliente[]>('clientes', [])
  return contas.map((c) => ({ ...c, cliente: clientes.find((cl) => cl.id === c.cliente_id) }))
}

export async function listContasPagar(): Promise<ContaPagar[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('contas_pagar')
      .select('*')
      .order('data_vencimento', { ascending: true })
    if (error) throw error
    return data as ContaPagar[]
  }
  return lsGet<ContaPagar[]>('contas_pagar', [])
}

export async function criarContaPagar(payload: Partial<ContaPagar>): Promise<ContaPagar> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('contas_pagar').insert(payload).select().single()
    if (error) throw error
    return data as ContaPagar
  }
  const contas = lsGet<ContaPagar[]>('contas_pagar', [])
  const nova: ContaPagar = {
    id: uuid(),
    fornecedor: payload.fornecedor || null,
    descricao: payload.descricao || '',
    valor: payload.valor || 0,
    status: 'pendente',
    data_vencimento: payload.data_vencimento || null,
    data_pagamento: null,
    created_at: nowIso(),
  }
  contas.push(nova)
  lsSet('contas_pagar', contas)
  return nova
}

export async function marcarContaPaga(tipo: 'receber' | 'pagar', id: string) {
  const tabela = tipo === 'receber' ? 'contas_receber' : 'contas_pagar'
  if (supabaseConfigured) {
    const { error } = await supabase.from(tabela).update({ status: 'pago' }).eq('id', id)
    if (error) throw error
    return
  }
  const key = tipo === 'receber' ? 'contas_receber' : 'contas_pagar'
  const contas = lsGet<(ContaReceber | ContaPagar)[]>(key, [])
  const idx = contas.findIndex((c) => c.id === id)
  if (idx >= 0) {
    contas[idx].status = 'pago'
    contas[idx].data_pagamento = nowIso()
    lsSet(key, contas)
    const caixa = lsGet<any[]>('caixa_movimentacoes', [])
    caixa.push({
      id: uuid(),
      tipo: tipo === 'receber' ? 'entrada' : 'saida',
      categoria: tipo === 'receber' ? 'Recebimento OS' : 'Pagamento fornecedor',
      descricao: contas[idx].descricao,
      valor: contas[idx].valor,
      data_movimentacao: nowIso(),
      origem: key,
      origem_id: id,
      created_at: nowIso(),
    })
    lsSet('caixa_movimentacoes', caixa)
  }
}

// ---------- EMPRESA / CONFIGURAÇÕES ----------

export async function getEmpresaConfig(): Promise<EmpresaConfig | null> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('empresa_config').select('*').limit(1).maybeSingle()
    if (error) throw error
    return data as EmpresaConfig | null
  }
  return lsGet<EmpresaConfig | null>('empresa_config', null)
}

export async function salvarEmpresaConfig(config: Partial<EmpresaConfig>): Promise<EmpresaConfig> {
  if (supabaseConfigured) {
    const existente = await getEmpresaConfig()
    const { data, error } = await supabase
      .from('empresa_config')
      .upsert({ id: existente?.id, ...config })
      .select()
      .single()
    if (error) throw error
    return data as EmpresaConfig
  }
  const atual = lsGet<EmpresaConfig | null>('empresa_config', null)
  const nova: EmpresaConfig = {
    id: atual?.id || uuid(),
    nome_fantasia: config.nome_fantasia ?? atual?.nome_fantasia ?? 'Minha Oficina',
    razao_social: config.razao_social ?? atual?.razao_social ?? null,
    cnpj: config.cnpj ?? atual?.cnpj ?? null,
    logo_url: config.logo_url ?? atual?.logo_url ?? null,
    cor_primaria: config.cor_primaria ?? atual?.cor_primaria ?? '#F2600C',
    telefone: config.telefone ?? atual?.telefone ?? null,
    endereco: config.endereco ?? atual?.endereco ?? null,
    created_at: atual?.created_at ?? nowIso(),
    updated_at: nowIso(),
  }
  lsSet('empresa_config', nova)
  return nova
}
