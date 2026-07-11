import { STATUS_OS_LABELS, type StatusOS } from '@/types/database'

const COLOR_MAP: Record<StatusOS, string> = {
  orcamento: 'bg-gray-100 text-gray-600 border-gray-300',
  aprovado: 'bg-steel-light text-steel border-steel/30',
  em_execucao: 'bg-amber-50 text-amber-700 border-amber-300',
  aguardando_peca: 'bg-purple-50 text-purple-700 border-purple-300',
  aguardando_cliente: 'bg-blue-50 text-blue-700 border-blue-300',
  concluido: 'bg-green-50 text-green-700 border-green-300',
  entregue: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  cancelado: 'bg-red-50 text-red-700 border-red-300',
}

export function StatusBadge({ status }: { status: StatusOS }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${COLOR_MAP[status]}`}
    >
      {STATUS_OS_LABELS[status]}
    </span>
  )
}
