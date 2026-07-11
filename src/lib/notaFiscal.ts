import { supabase, supabaseConfigured } from './supabase'
import { getNotaFiscalConfig } from './whatsappNfe'
import type { NotaFiscalConfig } from '@/types/database'

export interface NotaFiscalRegistro {
  id: string
  os_id: string | null
  tipo: 'nfe' | 'nfse' | 'nfce'
  ref: string | null
  numero: number | null
  serie: string | null
  status: 'pendente' | 'processando' | 'emitida' | 'cancelada' | 'erro'
  chave_acesso: string | null
  protocolo: string | null
  link_pdf: string | null
  link_xml: string | null
  mensagem_erro: string | null
  valor: number | null
  created_at: string
  updated_at: string
}

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

// Chama o proxy seguro (Vercel ou servidor local do Electron). O caminho é
// relativo, então funciona igual nos dois ambientes.
async function chamarFocusNFe(metodo: string, caminho: string, corpo: unknown, ambiente: 'homologacao' | 'producao') {
  const chave = import.meta.env.VITE_PROXY_SHARED_KEY as string | undefined
  const resposta = await fetch('/api/focus-nfe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(chave ? { 'x-jucax-proxy-key': chave } : {}),
    },
    body: JSON.stringify({ metodo, caminho, corpo, ambiente }),
  })
  const dados = await resposta.json()
  if (!resposta.ok) {
    throw new Error(dados?.erro || dados?.mensagem || 'Erro ao comunicar com o Focus NFe.')
  }
  return dados
}

async function salvarRegistroNota(registro: Partial<NotaFiscalRegistro>): Promise<NotaFiscalRegistro> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('notas_fiscais').upsert(registro).select().single()
    if (error) throw error
    return data as NotaFiscalRegistro
  }
  const notas = lsGet<NotaFiscalRegistro[]>('notas_fiscais', [])
  if (registro.id) {
    const idx = notas.findIndex((n) => n.id === registro.id)
    if (idx >= 0) {
      notas[idx] = { ...notas[idx], ...registro, updated_at: new Date().toISOString() } as NotaFiscalRegistro
      lsSet('notas_fiscais', notas)
      return notas[idx]
    }
  }
  const nova: NotaFiscalRegistro = {
    id: uuid(),
    os_id: registro.os_id || null,
    tipo: registro.tipo || 'nfse',
    ref: registro.ref || null,
    numero: registro.numero || null,
    serie: registro.serie || null,
    status: registro.status || 'pendente',
    chave_acesso: registro.chave_acesso || null,
    protocolo: registro.protocolo || null,
    link_pdf: registro.link_pdf || null,
    link_xml: registro.link_xml || null,
    mensagem_erro: registro.mensagem_erro || null,
    valor: registro.valor || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  notas.push(nova)
  lsSet('notas_fiscais', notas)
  return nova
}

export async function listNotasFiscaisPorOS(osId: string): Promise<NotaFiscalRegistro[]> {
  if (supabaseConfigured) {
    const { data, error } = await supabase.from('notas_fiscais').select('*').eq('os_id', osId)
    if (error) throw error
    return data as NotaFiscalRegistro[]
  }
  return lsGet<NotaFiscalRegistro[]>('notas_fiscais', []).filter((n) => n.os_id === osId)
}

// Emite uma NFS-e (nota de serviço) referente à OS. O payload segue a
// estrutura documentada em doc.focusnfe.com.br/reference/nfse — os campos
// de prestador/serviço vêm da configuração fiscal salva em Configurações,
// e podem precisar de ajuste fino conforme as regras do município.
export async function emitirNFSe(payload: {
  osId: string
  numeroOS: number
  valorServicos: number
  discriminacao: string
  tomador: { nome: string; cpf_cnpj?: string; email?: string; telefone?: string }
}): Promise<NotaFiscalRegistro> {
  const config = await getNotaFiscalConfig()
  if (!config) throw new Error('Configure os dados fiscais em Configurações → Nota Fiscal antes de emitir.')

  const ref = `os${payload.numeroOS}-nfse-${Date.now()}`

  const corpo = {
    data_emissao: new Date().toISOString(),
    natureza_operacao: 'Prestação de serviço',
    optante_simples_nacional: config.regime_tributario === 'simples_nacional',
    discriminacao: payload.discriminacao,
    valor_servicos: payload.valorServicos,
    aliquota: config.aliquota_iss || 0,
    iss_retido: false,
    item_lista_servico: config.codigo_servico_municipal || '',
    codigo_cnae: config.cnae || '',
    tomador: {
      cpf_cnpj: payload.tomador.cpf_cnpj?.replace(/\D/g, '') || undefined,
      razao_social: payload.tomador.nome,
      email: payload.tomador.email || undefined,
      telefone: payload.tomador.telefone?.replace(/\D/g, '') || undefined,
    },
  }

  let registro = await salvarRegistroNota({
    os_id: payload.osId,
    tipo: 'nfse',
    ref,
    status: 'processando',
    valor: payload.valorServicos,
  })

  try {
    const resultado = await chamarFocusNFe('POST', `/v2/nfse?ref=${ref}`, corpo, config.ambiente)
    registro = await salvarRegistroNota({
      id: registro.id,
      status: resultado.status === 'erro_autorizacao' ? 'erro' : 'processando',
      numero: resultado.numero || null,
      protocolo: resultado.numero_rps || null,
      link_pdf: resultado.url || null,
      mensagem_erro: resultado.mensagem || null,
    })
  } catch (erro: any) {
    registro = await salvarRegistroNota({ id: registro.id, status: 'erro', mensagem_erro: erro.message })
    throw erro
  }

  return registro
}

// Consulta o status atual de uma nota já enviada (processamento é assíncrono).
export async function consultarStatusNota(registro: NotaFiscalRegistro): Promise<NotaFiscalRegistro> {
  const config = await getNotaFiscalConfig()
  if (!config || !registro.ref) return registro

  const caminho = registro.tipo === 'nfse' ? `/v2/nfse/${registro.ref}` : `/v2/nfe/${registro.ref}`
  const resultado = await chamarFocusNFe('GET', caminho, null, config.ambiente)

  return salvarRegistroNota({
    id: registro.id,
    status: resultado.status === 'autorizado' ? 'emitida' : resultado.status === 'erro_autorizacao' ? 'erro' : 'processando',
    numero: resultado.numero || registro.numero,
    chave_acesso: resultado.chave_nfe || resultado.chave_nfse || registro.chave_acesso,
    link_pdf: resultado.url || registro.link_pdf,
    link_xml: resultado.caminho_xml_nota_fiscal || registro.link_xml,
    mensagem_erro: resultado.mensagem || null,
  })
}

export async function cancelarNota(registro: NotaFiscalRegistro, justificativa: string): Promise<NotaFiscalRegistro> {
  const config = await getNotaFiscalConfig()
  if (!config || !registro.ref) throw new Error('Nota sem referência válida para cancelamento.')

  const caminho = registro.tipo === 'nfse' ? `/v2/nfse/${registro.ref}` : `/v2/nfe/${registro.ref}`
  await chamarFocusNFe('DELETE', caminho, { justificativa }, config.ambiente)

  return salvarRegistroNota({ id: registro.id, status: 'cancelada' })
}

export function notaFiscalPronta(config: NotaFiscalConfig | null): { pronta: boolean; motivo?: string } {
  if (!config) return { pronta: false, motivo: 'Configure os dados fiscais primeiro.' }
  if (!config.ativo) return { pronta: false, motivo: 'Integração ainda não ativada em Configurações → Nota Fiscal.' }
  return { pronta: true }
}
