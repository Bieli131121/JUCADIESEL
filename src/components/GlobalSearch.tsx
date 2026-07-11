import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, Car, Wrench, X } from 'lucide-react'
import { listClientes, listVeiculos, listOrdensServico } from '@/lib/db'
import type { Cliente, Veiculo, OrdemServico } from '@/types/database'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [carregado, setCarregado] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    function handleAbrirEvento() {
      setOpen(true)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('abrir-busca-global', handleAbrirEvento)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('abrir-busca-global', handleAbrirEvento)
    }
  }, [])

  useEffect(() => {
    if (open && !carregado) {
      Promise.all([listClientes(), listVeiculos(), listOrdensServico()]).then(([c, v, o]) => {
        setClientes(c)
        setVeiculos(v)
        setOrdens(o)
        setCarregado(true)
      })
    }
  }, [open, carregado])

  if (!open) return null

  const termo = query.trim().toLowerCase()

  const clientesEncontrados = termo
    ? clientes.filter((c) => c.nome.toLowerCase().includes(termo) || c.telefone.includes(termo)).slice(0, 5)
    : []
  const veiculosEncontrados = termo
    ? veiculos.filter((v) => v.placa.toLowerCase().includes(termo) || v.modelo.toLowerCase().includes(termo)).slice(0, 5)
    : []
  const ordensEncontradas = termo
    ? ordens.filter((o) => String(o.numero).includes(termo) || o.cliente?.nome.toLowerCase().includes(termo)).slice(0, 5)
    : []

  const semResultados =
    termo && clientesEncontrados.length === 0 && veiculosEncontrados.length === 0 && ordensEncontradas.length === 0

  function ir(caminho: string) {
    navigate(caminho)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-24 p-4">
      <div className="absolute inset-0 bg-graphite/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-surface rounded-xl shadow-popover border border-border animate-scale-in overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-ink-soft shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-soft"
            placeholder="Buscar cliente, placa ou nº de OS..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={() => setOpen(false)} className="text-ink-soft hover:text-ink shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {!termo && (
            <p className="text-xs text-ink-soft text-center py-6">Digite para buscar em clientes, veículos e ordens de serviço.</p>
          )}

          {clientesEncontrados.length > 0 && (
            <div className="px-2">
              <p className="text-[10px] font-semibold uppercase text-ink-soft px-2 py-1">Clientes</p>
              {clientesEncontrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => ir('/clientes')}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-canvas text-sm text-left"
                >
                  <User size={14} className="text-ink-soft shrink-0" />
                  <span className="text-ink">{c.nome}</span>
                  <span className="text-ink-soft text-xs ml-auto font-mono">{c.telefone}</span>
                </button>
              ))}
            </div>
          )}

          {veiculosEncontrados.length > 0 && (
            <div className="px-2">
              <p className="text-[10px] font-semibold uppercase text-ink-soft px-2 py-1">Veículos</p>
              {veiculosEncontrados.map((v) => (
                <button
                  key={v.id}
                  onClick={() => ir(`/veiculos?busca=${encodeURIComponent(v.placa)}`)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-canvas text-sm text-left"
                >
                  <Car size={14} className="text-ink-soft shrink-0" />
                  <span className="font-mono text-xs">{v.placa}</span>
                  <span className="text-ink">{v.marca} {v.modelo}</span>
                </button>
              ))}
            </div>
          )}

          {ordensEncontradas.length > 0 && (
            <div className="px-2">
              <p className="text-[10px] font-semibold uppercase text-ink-soft px-2 py-1">Ordens de Serviço</p>
              {ordensEncontradas.map((o) => (
                <button
                  key={o.id}
                  onClick={() => ir(`/ordens-servico/${o.id}`)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-canvas text-sm text-left"
                >
                  <Wrench size={14} className="text-ink-soft shrink-0" />
                  <span className="font-mono text-xs">#{o.numero}</span>
                  <span className="text-ink">{o.cliente?.nome}</span>
                </button>
              ))}
            </div>
          )}

          {semResultados && <p className="text-sm text-ink-soft text-center py-6">Nenhum resultado encontrado.</p>}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[11px] text-ink-soft">
          <span><kbd className="font-mono bg-canvas px-1 rounded">Ctrl</kbd> + <kbd className="font-mono bg-canvas px-1 rounded">K</kbd> abre a busca</span>
          <span><kbd className="font-mono bg-canvas px-1 rounded">Esc</kbd> fecha</span>
        </div>
      </div>
    </div>
  )
}
