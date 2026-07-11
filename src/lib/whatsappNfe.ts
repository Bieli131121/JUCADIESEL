import { supabase, supabaseConfigured } from './supabase'
import type { WhatsappConfig, WhatsappTemplate, TipoTemplateWhatsapp, NotaFiscalConfig } from '@/types/database'

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

const TEMPLATES_PADRAO: Record<TipoTemplateWhatsapp, string> = {
  orcamento:
    'Olá {{cliente}}! Segue o orçamento da OS #{{numero_os}} referente ao seu {{veiculo}}, no valor de {{valor}}. Qualquer dúvida, estamos à disposição.',
  os_aberta:
    'Olá {{cliente}}! Abrimos a OS #{{numero_os}} para o seu {{veiculo}}. Assim que tivermos novidades, avisamos por aqui.',
  os_finalizada:
    'Olá {{cliente}}! O serviço da OS #{{numero_os}} do seu {{veiculo}} foi concluído. Valor total: {{valor}}.',
  veiculo_pronto:
    'Olá {{cliente}}! Seu {{veiculo}} já está pronto para retirada. Nos aguardamos você na oficina!',
  lembrete_revisao:
    'Olá {{cliente}}! Passando para lembrar que seu {{veiculo}} está com a revisão periódica próxima. Quer agendar um horário?',
  cobranca:
    'Olá {{cliente}}! Identificamos um valor em aberto de {{valor}} referente à OS #{{numero_os}}, com vencimento em {{vencimento}}. Pode nos confirmar o pagamento?',
  confirmacao_agendamento:
    'Olá {{cliente}}! Confirmando seu agendamento na oficina para {{data}} às {{hora}}. Até lá!',
}

// ---------- WHATSAPP CONFIG ----------

export async function getWhatsappConfig(): Promise<WhatsappConfig | null> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('whatsapp_config').select('*').limit(1).maybeSingle()
    if (error) throw error
    return data as WhatsappConfig | null
  }
  return lsGet<WhatsappConfig | null>('whatsapp_config', null)
}

export async function salvarWhatsappConfig(config: Partial<WhatsappConfig>): Promise<WhatsappConfig> {
  const atual = await getWhatsappConfig()
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .upsert({ id: atual?.id, ...config })
      .select()
      .single()
    if (error) throw error
    return data as WhatsappConfig
  }
  const nova: WhatsappConfig = {
    id: atual?.id || uuid(),
    modo_envio: config.modo_envio ?? atual?.modo_envio ?? 'link_direto',
    provedor_api: config.provedor_api ?? atual?.provedor_api ?? null,
    token_api: config.token_api ?? atual?.token_api ?? null,
    numero_remetente: config.numero_remetente ?? atual?.numero_remetente ?? null,
    ativo: config.ativo ?? atual?.ativo ?? true,
    created_at: atual?.created_at ?? nowIso(),
    updated_at: nowIso(),
  }
  lsSet('whatsapp_config', nova)
  return nova
}

// ---------- TEMPLATES ----------

export async function garantirTemplatesPadrao(): Promise<void> {
  const existentes = await listTemplatesWhatsapp()
  const tiposExistentes = new Set(existentes.map((t) => t.tipo))
  const faltando = (Object.keys(TEMPLATES_PADRAO) as TipoTemplateWhatsapp[]).filter((t) => !tiposExistentes.has(t))
  for (const tipo of faltando) {
    await criarTemplateWhatsapp(tipo, TEMPLATES_PADRAO[tipo])
  }
}

async function criarTemplateWhatsapp(tipo: TipoTemplateWhatsapp, mensagem: string) {
  if (supabaseConfigured) {
    const { error } = await supabase.from('whatsapp_templates').insert({ tipo, mensagem })
    if (error) throw error
    return
  }
  const templates = lsGet<WhatsappTemplate[]>('whatsapp_templates', [])
  templates.push({ id: uuid(), tipo, mensagem, ativo: true, created_at: nowIso(), updated_at: nowIso() })
  lsSet('whatsapp_templates', templates)
}

export async function listTemplatesWhatsapp(): Promise<WhatsappTemplate[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('whatsapp_templates').select('*')
    if (error) throw error
    return data as WhatsappTemplate[]
  }
  return lsGet<WhatsappTemplate[]>('whatsapp_templates', [])
}

export async function atualizarTemplateWhatsapp(id: string, mensagem: string): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('whatsapp_templates').update({ mensagem }).eq('id', id)
    if (error) throw error
    return
  }
  const templates = lsGet<WhatsappTemplate[]>('whatsapp_templates', [])
  const idx = templates.findIndex((t) => t.id === id)
  if (idx >= 0) {
    templates[idx].mensagem = mensagem
    lsSet('whatsapp_templates', templates)
  }
}

export async function obterTemplatePorTipo(tipo: TipoTemplateWhatsapp): Promise<string> {
  const templates = await listTemplatesWhatsapp()
  return templates.find((t) => t.tipo === tipo)?.mensagem || TEMPLATES_PADRAO[tipo]
}

// ---------- LOG DE ENVIOS ----------

export async function registrarEnvioWhatsapp(payload: {
  cliente_id?: string | null
  os_id?: string | null
  tipo: TipoTemplateWhatsapp
  telefone: string
  mensagem: string
}): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase.from('whatsapp_log').insert(payload)
    if (error) throw error
    return
  }
  const logs = lsGet<any[]>('whatsapp_log', [])
  logs.push({ id: uuid(), created_at: nowIso(), ...payload })
  lsSet('whatsapp_log', logs)
}

export interface WhatsappLogEntry {
  id: string
  cliente_id: string | null
  os_id: string | null
  tipo: TipoTemplateWhatsapp
  telefone: string
  mensagem: string
  created_at: string
  cliente?: { nome: string }
}

export async function listWhatsappLog(limit = 100): Promise<WhatsappLogEntry[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('whatsapp_log')
      .select('*, cliente:clientes(nome)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as WhatsappLogEntry[]
  }
  const logs = lsGet<WhatsappLogEntry[]>('whatsapp_log', [])
  const clientes = lsGet<any[]>('clientes', [])
  return logs
    .map((l) => ({ ...l, cliente: clientes.find((c) => c.id === l.cliente_id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}

// ---------- NOTA FISCAL (estrutura preparada, sem integração) ----------

export async function getNotaFiscalConfig(): Promise<NotaFiscalConfig | null> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('nota_fiscal_config').select('*').limit(1).maybeSingle()
    if (error) throw error
    return data as NotaFiscalConfig | null
  }
  return lsGet<NotaFiscalConfig | null>('nota_fiscal_config', null)
}

export async function salvarNotaFiscalConfig(config: Partial<NotaFiscalConfig>): Promise<NotaFiscalConfig> {
  const atual = await getNotaFiscalConfig()
  if (supabaseConfigured) {
    const { data, error } = await supabase
      .from('nota_fiscal_config')
      .upsert({ id: atual?.id, ...config })
      .select()
      .single()
    if (error) throw error
    return data as NotaFiscalConfig
  }
  const nova: NotaFiscalConfig = {
    id: atual?.id || uuid(),
    ambiente: config.ambiente ?? atual?.ambiente ?? 'homologacao',
    tipo_padrao: config.tipo_padrao ?? atual?.tipo_padrao ?? 'nfse',
    provedor: config.provedor ?? atual?.provedor ?? 'focus_nfe',
    serie_padrao: config.serie_padrao ?? atual?.serie_padrao ?? null,
    proximo_numero: config.proximo_numero ?? atual?.proximo_numero ?? 1,
    cnae: config.cnae ?? atual?.cnae ?? null,
    codigo_servico_municipal: config.codigo_servico_municipal ?? atual?.codigo_servico_municipal ?? null,
    aliquota_iss: config.aliquota_iss ?? atual?.aliquota_iss ?? null,
    regime_tributario: config.regime_tributario ?? atual?.regime_tributario ?? 'simples_nacional',
    ativo: config.ativo ?? atual?.ativo ?? false,
    created_at: atual?.created_at ?? nowIso(),
    updated_at: nowIso(),
  }
  lsSet('nota_fiscal_config', nova)
  return nova
}
