// Tipos espelhando o schema.sql do Supabase

export type TipoTemplateWhatsapp =
  | 'orcamento'
  | 'os_aberta'
  | 'os_finalizada'
  | 'veiculo_pronto'
  | 'lembrete_revisao'
  | 'cobranca'
  | 'confirmacao_agendamento'

export const TIPO_TEMPLATE_LABELS: Record<TipoTemplateWhatsapp, string> = {
  orcamento: 'Orçamento enviado',
  os_aberta: 'OS aberta',
  os_finalizada: 'OS finalizada',
  veiculo_pronto: 'Veículo pronto para retirada',
  lembrete_revisao: 'Lembrete de revisão',
  cobranca: 'Cobrança',
  confirmacao_agendamento: 'Confirmação de agendamento',
}

export interface WhatsappConfig {
  id: string
  modo_envio: 'link_direto' | 'api_oficial'
  provedor_api: string | null
  token_api: string | null
  numero_remetente: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface WhatsappTemplate {
  id: string
  tipo: TipoTemplateWhatsapp
  mensagem: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface NotaFiscalConfig {
  id: string
  ambiente: 'homologacao' | 'producao'
  tipo_padrao: 'nfe' | 'nfse' | 'nfce'
  provedor: string | null
  serie_padrao: string | null
  proximo_numero: number
  cnae: string | null
  codigo_servico_municipal: string | null
  aliquota_iss: number | null
  regime_tributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface LogSistema {
  id: string
  usuario_nome: string | null
  categoria: 'login' | 'usuario' | 'configuracao' | 'os' | 'financeiro' | 'backup'
  acao: string
  detalhe: string | null
  created_at: string
}

export interface NfeCompraImportada {
  id: string
  chave_acesso: string
  numero: number | null
  serie: string | null
  emitente_nome: string | null
  emitente_cnpj: string | null
  valor_total: number | null
  itens_importados: number | null
  created_at: string
}

export type StatusItemChecklistEntrada = 'ok' | 'nao_ok' | 'na'

export interface ChecklistEntrada {
  id: string
  os_id: string
  observacoes_gerais: string | null
  assinatura_url: string | null
  concluido_em: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistEntradaItem {
  id: string
  os_id: string
  item: string
  ordem: number
  status: StatusItemChecklistEntrada | null
  observacao: string | null
  foto_url: string | null
  created_at: string
  updated_at: string
}

export const ITENS_CHECKLIST_ENTRADA_PADRAO = [
  'Pintura',
  'Faróis',
  'Lanternas',
  'Vidros',
  'Rodas',
  'Pneus',
  'Estepe',
  'Macaco',
  'Triângulo',
  'Som',
  'Documentos',
  'Combustível',
  'Quilometragem',
  'Riscos',
  'Amassados',
  'Acessórios',
]

export type Role = 'admin' | 'mecanico' | 'recepcao' | 'financeiro' | 'gerente'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  mecanico: 'Mecânico',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
  gerente: 'Gerente',
}

export interface Usuario {
  id: string
  nome: string
  usuario: string
  pin_hash: string
  role: Role
  mecanico_id: string | null
  ativo: boolean
  ultimo_acesso: string | null
  created_at: string
  updated_at: string
}

export type StatusOS =
  | 'orcamento'
  | 'aprovado'
  | 'em_execucao'
  | 'aguardando_peca'
  | 'aguardando_cliente'
  | 'concluido'
  | 'entregue'
  | 'cancelado'

export type StatusAgendamento = 'agendado' | 'confirmado' | 'convertido' | 'cancelado'
export type StatusConta = 'pendente' | 'pago' | 'cancelado'
export type TipoItemOS = 'servico' | 'peca'
export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste' | 'estorno'

export interface EmpresaConfig {
  id: string
  nome_fantasia: string
  razao_social: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  certificado_digital_status: 'nao_configurado' | 'configurado' | 'expirado'
  logo_url: string | null
  cor_primaria: string
  tema: 'claro' | 'escuro'
  telefone: string | null
  endereco: string | null
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  nome: string
  cpf_cnpj: string | null
  rg: string | null
  telefone: string
  whatsapp: string | null
  email: string | null
  foto_url: string | null
  cep: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface VeiculoFoto {
  id: string
  veiculo_id: string
  url: string
  created_at: string
}

export interface Veiculo {
  id: string
  cliente_id: string
  placa: string
  marca: string | null
  modelo: string
  ano: number | null
  motor: string | null
  combustivel: string | null
  cor: string | null
  km_atual: number
  chassi: string | null
  renavam: string | null
  intervalo_revisao_km: number | null
  intervalo_revisao_meses: number | null
  ultima_revisao_km: number | null
  ultima_revisao_data: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
  fotos?: VeiculoFoto[]
}

export interface Fornecedor {
  id: string
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  contato: string | null
  prazo_pagamento_dias: number | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export type StatusOrdemCompra = 'rascunho' | 'enviada' | 'recebida' | 'cancelada'

export interface OrdemCompra {
  id: string
  numero: number
  fornecedor_id: string | null
  status: StatusOrdemCompra
  valor_total: number
  observacoes: string | null
  data_envio: string | null
  data_recebimento: string | null
  created_at: string
  updated_at: string
  fornecedor?: Fornecedor
  itens?: OrdemCompraItem[]
}

export interface OrdemCompraItem {
  id: string
  ordem_compra_id: string
  peca_id: string | null
  descricao: string
  quantidade: number
  preco_unitario: number
  valor_total: number
  created_at: string
  peca?: Peca
}

export interface Peca {
  id: string
  nome: string
  codigo: string | null
  codigo_barras: string | null
  categoria: string | null
  localizacao: string | null
  quantidade_estoque: number
  estoque_minimo: number
  preco_custo: number
  preco_venda: number
  fornecedor: string | null
  fornecedor_id: string | null
  created_at: string
  updated_at: string
}

export interface Mecanico {
  id: string
  nome: string
  telefone: string | null
  especialidade: string | null
  comissao_percentual: number
  ativo: boolean
  created_at: string
}

export interface Agendamento {
  id: string
  cliente_id: string | null
  veiculo_id: string | null
  mecanico_id: string | null
  data_hora: string
  descricao: string | null
  status: StatusAgendamento
  os_id: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
  veiculo?: Veiculo
  mecanico?: Mecanico
}

export interface OrdemServico {
  id: string
  numero: number
  cliente_id: string
  veiculo_id: string
  mecanico_id: string | null
  status: StatusOS
  km_entrada: number | null
  defeito_relatado: string | null
  diagnostico: string | null
  valor_desconto: number
  valor_frete: number
  valor_pago: number
  garantia_dias: number | null
  assinatura_url: string | null
  criado_por: string | null
  token_aprovacao: string | null
  aprovado_pelo_cliente_em: string | null
  valor_total: number
  data_orcamento: string
  data_aprovacao: string | null
  data_conclusao: string | null
  data_entrega: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
  veiculo?: Veiculo
  mecanico?: Mecanico
  itens?: OSItem[]
}

export interface OSItem {
  id: string
  os_id: string
  tipo: TipoItemOS
  peca_id: string | null
  descricao: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  tempo_minutos: number | null
  estoque_baixado: boolean
  created_at: string
  peca?: Peca
}

export interface OSAnexo {
  id: string
  os_id: string
  url: string
  tipo: 'foto' | 'video'
  descricao: string | null
  created_at: string
}

export interface OSChecklistItem {
  id: string
  os_id: string
  descricao: string
  concluido: boolean
  created_at: string
}

export interface OSHistorico {
  id: string
  os_id: string
  usuario_nome: string | null
  acao: string
  detalhe: string | null
  created_at: string
}

export interface MovimentacaoEstoque {
  id: string
  peca_id: string
  tipo: TipoMovimentacao
  quantidade: number
  motivo: string | null
  os_id: string | null
  created_at: string
  peca?: Peca
}

export interface ContaReceber {
  id: string
  os_id: string | null
  cliente_id: string | null
  descricao: string
  valor: number
  categoria: string | null
  centro_custo: string | null
  conciliado: boolean
  status: StatusConta
  data_vencimento: string | null
  data_pagamento: string | null
  forma_pagamento: string | null
  grupo_parcela_id: string | null
  parcela_numero: number | null
  parcela_total: number | null
  created_at: string
  cliente?: Cliente
}

export interface ContaPagar {
  id: string
  fornecedor: string | null
  descricao: string
  valor: number
  categoria: string | null
  centro_custo: string | null
  forma_pagamento: string | null
  conciliado: boolean
  status: StatusConta
  data_vencimento: string | null
  data_pagamento: string | null
  grupo_parcela_id: string | null
  parcela_numero: number | null
  parcela_total: number | null
  created_at: string
}

export interface CaixaMovimentacao {
  id: string
  tipo: 'entrada' | 'saida'
  categoria: string | null
  centro_custo: string | null
  forma_pagamento: string | null
  conciliado: boolean
  descricao: string
  valor: number
  data_movimentacao: string
  origem: string | null
  origem_id: string | null
  created_at: string
}

export const FORMAS_PAGAMENTO = ['Dinheiro', 'PIX', 'Cartão de crédito', 'Cartão de débito', 'Cheque', 'Transferência'] as const

export const STATUS_OS_LABELS: Record<StatusOS, string> = {
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  em_execucao: 'Em execução',
  aguardando_peca: 'Aguardando peça',
  aguardando_cliente: 'Aguardando cliente',
  concluido: 'Concluído',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const STATUS_OS_ORDER: StatusOS[] = [
  'orcamento',
  'aprovado',
  'em_execucao',
  'aguardando_peca',
  'concluido',
  'entregue',
]

// Transições permitidas a partir de cada status (usado no seletor de status da OS)
export const STATUS_TRANSICOES: Record<StatusOS, StatusOS[]> = {
  orcamento: ['aprovado', 'cancelado'],
  aprovado: ['em_execucao', 'cancelado'],
  em_execucao: ['aguardando_peca', 'aguardando_cliente', 'concluido', 'cancelado'],
  aguardando_peca: ['em_execucao', 'cancelado'],
  aguardando_cliente: ['em_execucao', 'cancelado'],
  concluido: ['entregue', 'cancelado'],
  entregue: [],
  cancelado: [],
}
