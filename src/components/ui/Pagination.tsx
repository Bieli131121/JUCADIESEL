import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  paginaAtual: number
  totalItens: number
  itensPorPagina: number
  onMudarPagina: (pagina: number) => void
}

export function Pagination({ paginaAtual, totalItens, itensPorPagina, onMudarPagina }: PaginationProps) {
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina))
  if (totalPaginas <= 1) return null

  const inicio = (paginaAtual - 1) * itensPorPagina + 1
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens)

  return (
    <div className="flex items-center justify-between px-1 py-2 text-sm">
      <span className="text-ink-soft text-xs">
        {inicio}–{fim} de {totalItens}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onMudarPagina(Math.max(1, paginaAtual - 1))}
          disabled={paginaAtual === 1}
          className="p-1.5 rounded-lg text-ink-soft hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-ink-soft font-mono px-2">
          {paginaAtual} / {totalPaginas}
        </span>
        <button
          onClick={() => onMudarPagina(Math.min(totalPaginas, paginaAtual + 1))}
          disabled={paginaAtual === totalPaginas}
          className="p-1.5 rounded-lg text-ink-soft hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
