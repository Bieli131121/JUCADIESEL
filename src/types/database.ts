// Tipos espelhando o schema.sql do Supabase

export type StatusOS =
  | 'orcamento'
  | 'aprovado'
  | 'em_execucao'
  | 'aguardando_peca'
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
  logo_url: string | null
  cor_primaria: string
  telefone: string | null
  endereco: string | null
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  nome: string
  cpf_cnpj: string | null
  telefone: string
  email: string | null
  endereco: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface Veiculo {
  id: string
  cliente_id: string
  placa: string
  marca: string | null
  modelo: string
  ano: number | null
  cor: string | null
  km_atual: number
  chassi: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
}

export interface Peca {
  id: string
  nome: string
  codigo: string | null
  categoria: string | null
  quantidade_estoque: number
  estoque_minimo: number
  preco_custo: number
  preco_venda: number
  fornecedor: string | null
  created_at: string
  updated_at: string
}

export interface Mecanico {
  id: string
  nome: string
  telefone: string | null
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
  estoque_baixado: boolean
  created_at: string
  peca?: Peca
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
  status: StatusConta
  data_vencimento: string | null
  data_pagamento: string | null
  forma_pagamento: string | null
  created_at: string
  cliente?: Cliente
}

export interface ContaPagar {
  id: string
  fornecedor: string | null
  descricao: string
  valor: number
  status: StatusConta
  data_vencimento: string | null
  data_pagamento: string | null
  created_at: string
}

export interface CaixaMovimentacao {
  id: string
  tipo: 'entrada' | 'saida'
  categoria: string | null
  descricao: string
  valor: number
  data_movimentacao: string
  origem: string | null
  origem_id: string | null
  created_at: string
}

export const STATUS_OS_LABELS: Record<StatusOS, string> = {
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  em_execucao: 'Em execução',
  aguardando_peca: 'Aguardando peça',
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
