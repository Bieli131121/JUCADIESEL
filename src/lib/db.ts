// Camada de dados única: usa Supabase quando configurado, cai para localStorage
// quando não há .env (ex: primeira instalação do app desktop sem internet).
// As regras de negócio replicadas aqui (baixa de estoque, geração de conta a
// receber) espelham os triggers do schema.sql para manter paridade no modo local.

import { supabase, supabaseConfigured } from './supabase'
import { limparTexto, limparTextoOuNull } from './sanitize'
import type {
  Cliente,
  Veiculo,
  VeiculoFoto,
  Peca,
  Mecanico,
  Agendamento,
  OrdemServico,
  OSItem,
  OSAnexo,
  OSChecklistItem,
  OSHistorico,
  ContaReceber,
  ContaPagar,
  CaixaMovimentacao,
  MovimentacaoEstoque,
  EmpresaConfig,
  StatusOS,
  NfeCompraImportada,
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
    nome: limparTexto(cliente.nome),
    cpf_cnpj: cliente.cpf_cnpj || null,
    rg: cliente.rg || null,
    telefone: cliente.telefone || '',
    whatsapp: cliente.whatsapp || null,
    email: cliente.email || null,
    foto_url: cliente.foto_url || null,
    cep: cliente.cep || null,
    endereco: limparTextoOuNull(cliente.endereco),
    cidade: cliente.cidade || null,
    estado: cliente.estado || null,
    observacoes: limparTextoOuNull(cliente.observacoes),
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
    if (error) {
      if (error.code === '23503') throw new Error('Não é possível excluir: este cliente tem Ordens de Serviço ou outros registros vinculados.')
      throw error
    }
    return
  }
  const temOSVinculada = lsGet<OrdemServico[]>('ordens_servico', []).some((os) => os.cliente_id === id)
  if (temOSVinculada) {
    throw new Error('Não é possível excluir: este cliente tem Ordens de Serviço vinculadas.')
  }
  lsSet('clientes', lsGet<Cliente[]>('clientes', []).filter((c) => c.id !== id))
  // Exclui em cadeia os veículos e fotos desse cliente (mesmo comportamento do "on delete cascade" do Supabase)
  const veiculosDoCliente = lsGet<Veiculo[]>('veiculos', []).filter((v) => v.cliente_id === id)
  lsSet('veiculos', lsGet<Veiculo[]>('veiculos', []).filter((v) => v.cliente_id !== id))
  const idsVeiculos = new Set(veiculosDoCliente.map((v) => v.id))
  lsSet('veiculo_fotos', lsGet<VeiculoFoto[]>('veiculo_fotos', []).filter((f) => !idsVeiculos.has(f.veiculo_id)))
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
    motor: veiculo.motor || null,
    combustivel: veiculo.combustivel || null,
    cor: veiculo.cor || null,
    km_atual: veiculo.km_atual || 0,
    chassi: veiculo.chassi || null,
    renavam: veiculo.renavam || null,
    intervalo_revisao_km: veiculo.intervalo_revisao_km || null,
    intervalo_revisao_meses: veiculo.intervalo_revisao_meses || null,
    ultima_revisao_km: veiculo.ultima_revisao_km || null,
    ultima_revisao_data: veiculo.ultima_revisao_data || null,
    observacoes: limparTextoOuNull(veiculo.observacoes),
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
    if (error) {
      if (error.code === '23503') throw new Error('Não é possível excluir: este veículo tem Ordens de Serviço ou outros registros vinculados.')
      throw error
    }
    return
  }
  const temOSVinculada = lsGet<OrdemServico[]>('ordens_servico', []).some((os) => os.veiculo_id === id)
  if (temOSVinculada) {
    throw new Error('Não é possível excluir: este veículo tem Ordens de Serviço vinculadas.')
  }
  lsSet('veiculos', lsGet<Veiculo[]>('veiculos', []).filter((v) => v.id !== id))
  lsSet('veiculo_fotos', lsGet<VeiculoFoto[]>('veiculo_fotos', []).filter((f) => f.veiculo_id !== id))
}

export async function listFotosVeiculo(veiculoId: string): Promise<VeiculoFoto[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('veiculo_fotos').select('*').eq('veiculo_id', veiculoId)
    if (error) throw error
    return data as VeiculoFoto[]
  }
  return lsGet<VeiculoFoto[]>('veiculo_fotos', []).filter((f) => f.veiculo_id === veiculoId)
}

export async function adicionarFotoVeiculo(veiculoId: string, url: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('veiculo_fotos').insert({ veiculo_id: veiculoId, url })
    if (error) throw error
    return
  }
  const fotos = lsGet<VeiculoFoto[]>('veiculo_fotos', [])
  fotos.push({ id: uuid(), veiculo_id: veiculoId, url, created_at: nowIso() })
  lsSet('veiculo_fotos', fotos)
}

export async function removerFotoVeiculo(fotoId: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('veiculo_fotos').delete().eq('id', fotoId)
    if (error) throw error
    return
  }
  lsSet('veiculo_fotos', lsGet<VeiculoFoto[]>('veiculo_fotos', []).filter((f) => f.id !== fotoId))
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
    nome: limparTexto(peca.nome),
    codigo: peca.codigo || null,
    codigo_barras: peca.codigo_barras || null,
    categoria: peca.categoria || null,
    localizacao: peca.localizacao || null,
    quantidade_estoque: peca.quantidade_estoque || 0,
    estoque_minimo: peca.estoque_minimo ?? 5,
    preco_custo: peca.preco_custo || 0,
    preco_venda: peca.preco_venda || 0,
    fornecedor: peca.fornecedor || null,
    fornecedor_id: peca.fornecedor_id || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  pecas.push(nova)
  lsSet('pecas', pecas)
  return nova
}

export async function deletePeca(id: string) {
  if (supabaseConfigured) {
    const { error } = await supabase.from('pecas').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir: esta peça já foi usada em alguma OS, compra ou movimentação de estoque.')
      }
      throw error
    }
    return
  }
  const usadaEmOS = lsGet<OSItem[]>('os_itens', []).some((i) => i.peca_id === id)
  const usadaEmMovimentacao = lsGet<MovimentacaoEstoque[]>('movimentacoes', []).some((m) => m.peca_id === id)
  const usadaEmCompra = lsGet<{ peca_id: string | null }[]>('ordens_compra_itens', []).some((i) => i.peca_id === id)
  if (usadaEmOS || usadaEmMovimentacao || usadaEmCompra) {
    throw new Error('Não é possível excluir: esta peça já foi usada em alguma OS, compra ou movimentação de estoque.')
  }
  lsSet('pecas', lsGet<Peca[]>('pecas', []).filter((p) => p.id !== id))
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

export async function registrarSaidaEstoque(pecaId: string, quantidade: number, motivo = 'Saída manual') {
  if (supabaseConfigured) {
    const { data: peca, error: e1 } = await supabase.from('pecas').select('quantidade_estoque').eq('id', pecaId).single()
    if (e1) throw e1
    const { error: e2 } = await supabase
      .from('pecas')
      .update({ quantidade_estoque: (peca.quantidade_estoque || 0) - quantidade })
      .eq('id', pecaId)
    if (e2) throw e2
    const { error: e3 } = await supabase.from('movimentacoes_estoque').insert({
      peca_id: pecaId,
      tipo: 'saida',
      quantidade,
      motivo,
    })
    if (e3) throw e3
    return
  }
  const pecas = lsGet<Peca[]>('pecas', [])
  const idx = pecas.findIndex((p) => p.id === pecaId)
  if (idx >= 0) {
    pecas[idx].quantidade_estoque -= quantidade
    lsSet('pecas', pecas)
  }
  const movs = lsGet<MovimentacaoEstoque[]>('movimentacoes', [])
  movs.push({ id: uuid(), peca_id: pecaId, tipo: 'saida', quantidade, motivo, os_id: null, created_at: nowIso() })
  lsSet('movimentacoes', movs)
}

export async function registrarAjusteInventario(pecaId: string, quantidadeContada: number, motivo = 'Ajuste de inventário') {
  const pecaAtual = (await listPecas()).find((p) => p.id === pecaId)
  if (!pecaAtual) return
  const diferenca = quantidadeContada - pecaAtual.quantidade_estoque

  if (supabaseConfigured) {
    const { error: e1 } = await supabase.from('pecas').update({ quantidade_estoque: quantidadeContada }).eq('id', pecaId)
    if (e1) throw e1
    const { error: e2 } = await supabase.from('movimentacoes_estoque').insert({
      peca_id: pecaId,
      tipo: 'ajuste',
      quantidade: diferenca,
      motivo: `${motivo} (${diferenca >= 0 ? '+' : ''}${diferenca})`,
    })
    if (e2) throw e2
    return
  }
  const pecas = lsGet<Peca[]>('pecas', [])
  const idx = pecas.findIndex((p) => p.id === pecaId)
  if (idx >= 0) {
    pecas[idx].quantidade_estoque = quantidadeContada
    lsSet('pecas', pecas)
  }
  const movs = lsGet<MovimentacaoEstoque[]>('movimentacoes', [])
  movs.push({
    id: uuid(),
    peca_id: pecaId,
    tipo: 'ajuste',
    quantidade: diferenca,
    motivo: `${motivo} (${diferenca >= 0 ? '+' : ''}${diferenca})`,
    os_id: null,
    created_at: nowIso(),
  })
  lsSet('movimentacoes', movs)
}

export async function listMovimentacoesPorPeca(pecaId: string): Promise<MovimentacaoEstoque[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select('*')
      .eq('peca_id', pecaId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as MovimentacaoEstoque[]
  }
  return lsGet<MovimentacaoEstoque[]>('movimentacoes', [])
    .filter((m) => m.peca_id === pecaId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function verificarNfeJaImportada(chaveAcesso: string): Promise<boolean> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('nfe_compras_importadas')
      .select('id')
      .eq('chave_acesso', chaveAcesso)
      .maybeSingle()
    if (error) throw error
    return !!data
  }
  return lsGet<NfeCompraImportada[]>('nfe_compras_importadas', []).some((n) => n.chave_acesso === chaveAcesso)
}

export async function registrarNfeImportada(dados: {
  chave_acesso: string
  numero: number
  serie: string
  emitente_nome: string
  emitente_cnpj: string
  valor_total: number
  itens_importados: number
}): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('nfe_compras_importadas').insert(dados)
    if (error) throw error
    return
  }
  const registros = lsGet<NfeCompraImportada[]>('nfe_compras_importadas', [])
  registros.push({ id: uuid(), created_at: nowIso(), ...dados })
  lsSet('nfe_compras_importadas', registros)
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

export async function listTodosMecanicos(): Promise<Mecanico[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('mecanicos').select('*').order('nome')
    if (error) throw error
    return data as Mecanico[]
  }
  return lsGet<Mecanico[]>('mecanicos', []).sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function alterarStatusMecanico(id: string, ativo: boolean): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('mecanicos').update({ ativo }).eq('id', id)
    if (error) throw error
    return
  }
  const mecanicos = lsGet<Mecanico[]>('mecanicos', [])
  const idx = mecanicos.findIndex((m) => m.id === id)
  if (idx >= 0) {
    mecanicos[idx].ativo = ativo
    lsSet('mecanicos', mecanicos)
  }
}

export async function deleteMecanico(id: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('mecanicos').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir: este mecânico já foi atribuído a alguma OS, agendamento ou usuário. Considere desativar em vez de excluir.')
      }
      throw error
    }
    return
  }
  const usadoEmOS = lsGet<OrdemServico[]>('ordens_servico', []).some((os) => os.mecanico_id === id)
  const usadoEmAgendamento = lsGet<{ mecanico_id: string | null }[]>('agendamentos', []).some((a) => a.mecanico_id === id)
  const usadoEmUsuario = lsGet<{ mecanico_id: string | null }[]>('usuarios', []).some((u) => u.mecanico_id === id)
  if (usadoEmOS || usadoEmAgendamento || usadoEmUsuario) {
    throw new Error('Não é possível excluir: este mecânico já foi atribuído a alguma OS, agendamento ou usuário. Considere desativar em vez de excluir.')
  }
  lsSet('mecanicos', lsGet<Mecanico[]>('mecanicos', []).filter((m) => m.id !== id))
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
    especialidade: mecanico.especialidade || null,
    comissao_percentual: mecanico.comissao_percentual || 0,
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
  criado_por?: string | null
}): Promise<OrdemServico> {
  payload = { ...payload, defeito_relatado: limparTextoOuNull(payload.defeito_relatado) }
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
    defeito_relatado: limparTextoOuNull(payload.defeito_relatado),
    diagnostico: null,
    valor_desconto: 0,
    valor_frete: 0,
    valor_pago: 0,
    garantia_dias: null,
    assinatura_url: null,
    criado_por: payload.criado_por || null,
    token_aprovacao: uuid(),
    aprovado_pelo_cliente_em: null,
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
  tempo_minutos?: number | null
}): Promise<void> {
  item = { ...item, descricao: limparTexto(item.descricao) }
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
    tempo_minutos: item.tempo_minutos ?? null,
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
  const soma = itens.reduce((sum, i) => sum + i.valor_total, 0)
  const todasOS = lsGet<OrdemServico[]>('ordens_servico', [])
  const idx = todasOS.findIndex((o) => o.id === osId)
  if (idx >= 0) {
    const desconto = todasOS[idx].valor_desconto || 0
    const frete = todasOS[idx].valor_frete || 0
    todasOS[idx].valor_total = soma - desconto + frete
    lsSet('ordens_servico', todasOS)
  }
}

// Muda status da OS. No modo Supabase, os triggers do banco cuidam de
// estoque e financeiro. No modo local, replicamos a mesma regra aqui.
export async function mudarStatusOS(osId: string, novoStatus: StatusOS, usuarioNome?: string): Promise<void> {
  const anterior = await getOrdemServico(osId)

  if (supabaseConfigured) {
    const { error } = await supabase.from('ordens_servico').update({ status: novoStatus }).eq('id', osId)
    if (error) throw error
    if (anterior) {
      await registrarHistoricoOS(osId, usuarioNome, 'Mudança de status', `${anterior.status} → ${novoStatus}`)
    }
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

  // Gera conta a receber ao entregar — só pelo saldo devedor, descontando o
  // que já foi pago (valor_pago), pra não cobrar de novo o que já entrou.
  if (novoStatus === 'entregue' && statusAnterior !== 'entregue') {
    os.data_entrega = nowIso()
    const saldoDevedor = os.valor_total - (os.valor_pago || 0)
    if (saldoDevedor > 0) {
      const contas = lsGet<ContaReceber[]>('contas_receber', [])
      contas.push({
        id: uuid(),
        os_id: os.id,
        cliente_id: os.cliente_id,
        descricao: `OS #${os.numero}`,
        valor: saldoDevedor,
        categoria: 'Serviços',
        centro_custo: null,
        conciliado: false,
        status: 'pendente',
        data_vencimento: new Date().toISOString().slice(0, 10),
        data_pagamento: null,
        forma_pagamento: null,
        grupo_parcela_id: null,
        parcela_numero: null,
        parcela_total: null,
        created_at: nowIso(),
      })
      lsSet('contas_receber', contas)
    }

    // Atualiza KM atual e data da última revisão do veículo automaticamente
    if (os.km_entrada) {
      const veiculos = lsGet<Veiculo[]>('veiculos', [])
      const vIdx = veiculos.findIndex((v) => v.id === os.veiculo_id)
      if (vIdx >= 0) {
        veiculos[vIdx].km_atual = Math.max(veiculos[vIdx].km_atual, os.km_entrada)
        veiculos[vIdx].ultima_revisao_km = os.km_entrada
        veiculos[vIdx].ultima_revisao_data = new Date().toISOString().slice(0, 10)
        lsSet('veiculos', veiculos)
      }
    }
  }

  os.status = novoStatus
  os.updated_at = nowIso()
  todasOS[idx] = os
  lsSet('ordens_servico', todasOS)
  await registrarHistoricoOS(osId, usuarioNome, 'Mudança de status', `${statusAnterior} → ${novoStatus}`)
}

// ---------- APROVAÇÃO DE ORÇAMENTO PELO CLIENTE (link público) ----------

export async function getOrdemServicoPorToken(token: string): Promise<OrdemServico | null> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*, cliente:clientes(*), veiculo:veiculos(*), itens:os_itens(*, peca:pecas(*))')
      .eq('token_aprovacao', token)
      .maybeSingle()
    if (error) throw error
    return data as OrdemServico | null
  }
  const todasOS = lsGet<OrdemServico[]>('ordens_servico', [])
  const os = todasOS.find((o) => o.token_aprovacao === token)
  if (!os) return null
  return getOrdemServico(os.id)
}

export async function aprovarOrcamentoPeloCliente(token: string): Promise<void> {
  const os = await getOrdemServicoPorToken(token)
  if (!os) throw new Error('Orçamento não encontrado.')
  if (os.status !== 'orcamento') throw new Error('Este orçamento já foi processado anteriormente.')

  await mudarStatusOS(os.id, 'aprovado', 'Cliente (aprovação online)')

  const agora = nowIso()
  if (supabaseConfigured) {
    const { error } = await supabase.from('ordens_servico').update({ aprovado_pelo_cliente_em: agora }).eq('id', os.id)
    if (error) throw error
    return
  }
  const todasOS = lsGet<OrdemServico[]>('ordens_servico', [])
  const idx = todasOS.findIndex((o) => o.id === os.id)
  if (idx >= 0) {
    todasOS[idx].aprovado_pelo_cliente_em = agora
    lsSet('ordens_servico', todasOS)
  }
}

// ---------- ANEXOS DA OS (fotos e vídeos) ----------

export async function listAnexosOS(osId: string): Promise<OSAnexo[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('os_anexos').select('*').eq('os_id', osId).order('created_at')
    if (error) throw error
    return data as OSAnexo[]
  }
  return lsGet<OSAnexo[]>('os_anexos', []).filter((a) => a.os_id === osId)
}

export async function adicionarAnexoOS(osId: string, url: string, tipo: 'foto' | 'video'): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('os_anexos').insert({ os_id: osId, url, tipo })
    if (error) throw error
    return
  }
  const anexos = lsGet<OSAnexo[]>('os_anexos', [])
  anexos.push({ id: uuid(), os_id: osId, url, tipo, descricao: null, created_at: nowIso() })
  lsSet('os_anexos', anexos)
}

export async function removerAnexoOS(anexoId: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('os_anexos').delete().eq('id', anexoId)
    if (error) throw error
    return
  }
  lsSet('os_anexos', lsGet<OSAnexo[]>('os_anexos', []).filter((a) => a.id !== anexoId))
}

// ---------- CHECKLIST DA OS ----------

export async function listChecklistOS(osId: string): Promise<OSChecklistItem[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('os_checklist_itens')
      .select('*')
      .eq('os_id', osId)
      .order('created_at')
    if (error) throw error
    return data as OSChecklistItem[]
  }
  return lsGet<OSChecklistItem[]>('os_checklist_itens', []).filter((c) => c.os_id === osId)
}

export async function adicionarChecklistItem(osId: string, descricao: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('os_checklist_itens').insert({ os_id: osId, descricao })
    if (error) throw error
    return
  }
  const itens = lsGet<OSChecklistItem[]>('os_checklist_itens', [])
  itens.push({ id: uuid(), os_id: osId, descricao, concluido: false, created_at: nowIso() })
  lsSet('os_checklist_itens', itens)
}

export async function alternarChecklistItem(itemId: string, concluido: boolean): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('os_checklist_itens').update({ concluido }).eq('id', itemId)
    if (error) throw error
    return
  }
  const itens = lsGet<OSChecklistItem[]>('os_checklist_itens', [])
  const idx = itens.findIndex((i) => i.id === itemId)
  if (idx >= 0) {
    itens[idx].concluido = concluido
    lsSet('os_checklist_itens', itens)
  }
}

export async function removerChecklistItem(itemId: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('os_checklist_itens').delete().eq('id', itemId)
    if (error) throw error
    return
  }
  lsSet('os_checklist_itens', lsGet<OSChecklistItem[]>('os_checklist_itens', []).filter((i) => i.id !== itemId))
}

// ---------- HISTÓRICO DE ALTERAÇÕES DA OS ----------

export async function listHistoricoOS(osId: string): Promise<OSHistorico[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('os_historico')
      .select('*')
      .eq('os_id', osId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as OSHistorico[]
  }
  return lsGet<OSHistorico[]>('os_historico', [])
    .filter((h) => h.os_id === osId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function registrarHistoricoOS(
  osId: string,
  usuarioNome: string | undefined,
  acao: string,
  detalhe?: string
): Promise<void> {
  const entrada = { os_id: osId, usuario_nome: usuarioNome || null, acao, detalhe: detalhe || null }
  if (supabaseConfigured) {
    const { error } = await supabase.from('os_historico').insert(entrada)
    if (error) throw error
    return
  }
  const historico = lsGet<OSHistorico[]>('os_historico', [])
  historico.push({ id: uuid(), created_at: nowIso(), ...entrada })
  lsSet('os_historico', historico)
}

// ---------- VALORES DA OS (desconto, frete, pago, garantia) ----------

export async function atualizarValoresOS(
  osId: string,
  valores: { valor_desconto?: number; valor_frete?: number; valor_pago?: number; garantia_dias?: number | null }
): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('ordens_servico').update(valores).eq('id', osId)
    if (error) throw error
    return
  }
  const todasOS = lsGet<OrdemServico[]>('ordens_servico', [])
  const idx = todasOS.findIndex((o) => o.id === osId)
  if (idx >= 0) {
    const valorPagoAnterior = todasOS[idx].valor_pago || 0
    todasOS[idx] = { ...todasOS[idx], ...valores, updated_at: nowIso() }
    lsSet('ordens_servico', todasOS)
    recalcularValorOSLocal(osId)

    // Se o valor pago aumentou, registra a diferença como entrada no caixa —
    // mesma regra do trigger fn_registrar_pagamento_os no modo Supabase.
    if (valores.valor_pago !== undefined && valores.valor_pago > valorPagoAnterior) {
      const caixa = lsGet<CaixaMovimentacao[]>('caixa_movimentacoes', [])
      caixa.push({
        id: uuid(),
        tipo: 'entrada',
        categoria: 'Serviços',
        centro_custo: null,
        forma_pagamento: null,
        conciliado: false,
        descricao: `Pagamento OS #${todasOS[idx].numero}`,
        valor: valores.valor_pago - valorPagoAnterior,
        data_movimentacao: nowIso(),
        origem: 'ordem_servico',
        origem_id: osId,
        created_at: nowIso(),
      })
      lsSet('caixa_movimentacoes', caixa)
    }
  }
}

export async function atualizarAssinaturaOS(osId: string, assinaturaUrl: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('ordens_servico').update({ assinatura_url: assinaturaUrl }).eq('id', osId)
    if (error) throw error
    return
  }
  const todasOS = lsGet<OrdemServico[]>('ordens_servico', [])
  const idx = todasOS.findIndex((o) => o.id === osId)
  if (idx >= 0) {
    todasOS[idx].assinatura_url = assinaturaUrl
    lsSet('ordens_servico', todasOS)
  }
}

export async function listTodosItensOS(): Promise<OSItem[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('os_itens')
      .select('*, os:ordens_servico(status, numero)')
    if (error) throw error
    return data as OSItem[]
  }
  return lsGet<OSItem[]>('os_itens', [])
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

export async function reagendar(id: string, novaDataHora: string) {
  if (supabaseConfigured) {
    const { error } = await supabase.from('agendamentos').update({ data_hora: novaDataHora }).eq('id', id)
    if (error) throw error
    return
  }
  const ags = lsGet<Agendamento[]>('agendamentos', [])
  const idx = ags.findIndex((a) => a.id === id)
  if (idx >= 0) {
    ags[idx].data_hora = novaDataHora
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
    categoria: payload.categoria || null,
    centro_custo: payload.centro_custo || null,
    forma_pagamento: payload.forma_pagamento || null,
    conciliado: false,
    status: 'pendente',
    data_vencimento: payload.data_vencimento || null,
    data_pagamento: null,
    grupo_parcela_id: payload.grupo_parcela_id || null,
    parcela_numero: payload.parcela_numero || null,
    parcela_total: payload.parcela_total || null,
    created_at: nowIso(),
  }
  contas.push(nova)
  lsSet('contas_pagar', contas)
  return nova
}

// Cria uma conta a pagar em N parcelas mensais (valor dividido igualmente,
// vencimentos espaçados por mês a partir da data informada).
export async function criarContaPagarParcelada(payload: {
  fornecedor: string | null
  descricao: string
  valorTotal: number
  numeroParcelas: number
  categoria: string | null
  centro_custo: string | null
  primeiroVencimento: string
}): Promise<ContaPagar[]> {
  const grupoId = uuid()
  const valorParcela = Math.round((payload.valorTotal / payload.numeroParcelas) * 100) / 100
  const criadas: ContaPagar[] = []

  for (let i = 0; i < payload.numeroParcelas; i++) {
    const vencimento = new Date(payload.primeiroVencimento)
    vencimento.setMonth(vencimento.getMonth() + i)

    // Ajusta a última parcela pra compensar arredondamento
    const ehUltima = i === payload.numeroParcelas - 1
    const valor = ehUltima
      ? Math.round((payload.valorTotal - valorParcela * (payload.numeroParcelas - 1)) * 100) / 100
      : valorParcela

    const conta = await criarContaPagar({
      fornecedor: payload.fornecedor,
      descricao: payload.numeroParcelas > 1 ? `${payload.descricao} (${i + 1}/${payload.numeroParcelas})` : payload.descricao,
      valor,
      categoria: payload.categoria,
      centro_custo: payload.centro_custo,
      data_vencimento: vencimento.toISOString().slice(0, 10),
      grupo_parcela_id: payload.numeroParcelas > 1 ? grupoId : null,
      parcela_numero: payload.numeroParcelas > 1 ? i + 1 : null,
      parcela_total: payload.numeroParcelas > 1 ? payload.numeroParcelas : null,
    })
    criadas.push(conta)
  }

  return criadas
}

export async function marcarContaPaga(tipo: 'receber' | 'pagar', id: string, formaPagamento?: string) {
  const tabela = tipo === 'receber' ? 'contas_receber' : 'contas_pagar'
  const updatePayload: Record<string, unknown> = { status: 'pago' }
  if (formaPagamento) updatePayload.forma_pagamento = formaPagamento

  if (supabaseConfigured) {
    // Aqui NÃO criamos o lançamento de caixa manualmente — os triggers
    // fn_pagamento_conta_receber / fn_pagamento_conta_pagar (schema.sql) fazem
    // isso automaticamente no banco assim que o status muda pra 'pago'. Se algum
    // dia esses triggers forem removidos/alterados, essa geração de caixa
    // também precisa ser reimplementada aqui.
    const { error } = await supabase.from(tabela).update(updatePayload).eq('id', id)
    if (error) throw error
    return
  }
  const key = tipo === 'receber' ? 'contas_receber' : 'contas_pagar'
  const contas = lsGet<(ContaReceber | ContaPagar)[]>(key, [])
  const idx = contas.findIndex((c) => c.id === id)
  if (idx >= 0) {
    contas[idx].status = 'pago'
    contas[idx].data_pagamento = nowIso()
    if (formaPagamento) contas[idx].forma_pagamento = formaPagamento
    lsSet(key, contas)
    const caixa = lsGet<CaixaMovimentacao[]>('caixa_movimentacoes', [])
    caixa.push({
      id: uuid(),
      tipo: tipo === 'receber' ? 'entrada' : 'saida',
      categoria: contas[idx].categoria || (tipo === 'receber' ? 'Serviços' : 'Fornecedores'),
      centro_custo: contas[idx].centro_custo || null,
      forma_pagamento: contas[idx].forma_pagamento || null,
      conciliado: false,
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

export async function alternarConciliacao(tabela: 'contas_receber' | 'contas_pagar' | 'caixa_movimentacoes', id: string, conciliado: boolean) {
  if (supabaseConfigured) {
    const { error } = await supabase.from(tabela).update({ conciliado }).eq('id', id)
    if (error) throw error
    return
  }
  const registros = lsGet<{ id: string; conciliado?: boolean }[]>(tabela, [])
  const idx = registros.findIndex((r) => r.id === id)
  if (idx >= 0) {
    registros[idx].conciliado = conciliado
    lsSet(tabela, registros)
  }
}

export async function listCaixaMovimentacoes(): Promise<CaixaMovimentacao[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('caixa_movimentacoes')
      .select('*')
      .order('data_movimentacao', { ascending: false })
    if (error) throw error
    return data as CaixaMovimentacao[]
  }
  return lsGet<CaixaMovimentacao[]>('caixa_movimentacoes', []).sort((a, b) =>
    b.data_movimentacao.localeCompare(a.data_movimentacao)
  )
}

export async function criarMovimentacaoCaixaManual(payload: {
  tipo: 'entrada' | 'saida'
  categoria: string
  centro_custo?: string | null
  forma_pagamento?: string | null
  descricao: string
  valor: number
}): Promise<void> {
  const registro = {
    tipo: payload.tipo,
    categoria: payload.categoria,
    centro_custo: payload.centro_custo || null,
    forma_pagamento: payload.forma_pagamento || null,
    conciliado: false,
    descricao: payload.descricao,
    valor: payload.valor,
    origem: 'manual',
    origem_id: null,
  }
  if (supabaseConfigured) {
    const { error } = await supabase.from('caixa_movimentacoes').insert(registro)
    if (error) throw error
    return
  }
  const caixa = lsGet<CaixaMovimentacao[]>('caixa_movimentacoes', [])
  caixa.push({ id: uuid(), data_movimentacao: nowIso(), created_at: nowIso(), ...registro })
  lsSet('caixa_movimentacoes', caixa)
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
    inscricao_estadual: config.inscricao_estadual ?? atual?.inscricao_estadual ?? null,
    inscricao_municipal: config.inscricao_municipal ?? atual?.inscricao_municipal ?? null,
    certificado_digital_status: config.certificado_digital_status ?? atual?.certificado_digital_status ?? 'nao_configurado',
    logo_url: config.logo_url ?? atual?.logo_url ?? null,
    cor_primaria: config.cor_primaria ?? atual?.cor_primaria ?? '#F2600C',
    tema: config.tema ?? atual?.tema ?? 'claro',
    telefone: config.telefone ?? atual?.telefone ?? null,
    endereco: config.endereco ?? atual?.endereco ?? null,
    created_at: atual?.created_at ?? nowIso(),
    updated_at: nowIso(),
  }
  lsSet('empresa_config', nova)
  return nova
}
