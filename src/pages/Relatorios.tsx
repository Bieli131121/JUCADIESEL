import { useEffect, useState } from 'react'
import { listOrdensServico, listPecas, listMovimentacoesEstoque } from '@/lib/db'
import type { OrdemServico, Peca, MovimentacaoEstoque } from '@/types/database'

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Relatorios() {
  const [os, setOs] = useState<OrdemServico[]>([])
  const [pecas, setPecas] = useState<Peca[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listOrdensServico(), listPecas(), listMovimentacoesEstoque()]).then(([o, p, m]) => {
      setOs(o)
      setPecas(p)
      setMovimentacoes(m)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-ink-soft text-sm">Carregando relatórios...</p>

  const entregues = os.filter((o) => o.status === 'entregue')
  const faturamentoTotal = entregues.reduce((s, o) => s + o.valor_total, 0)
  const ticketMedio = entregues.length ? faturamentoTotal / entregues.length : 0
  const criadas = os.filter((o) => o.status !== 'orcamento').length
  const totalOS = os.length
  const taxaConversao = totalOS ? Math.round((criadas / totalOS) * 100) : 0

  // Faturamento por mês
  const porMes = new Map<string, number>()
  entregues.forEach((o) => {
    if (!o.data_entrega) return
    const mes = o.data_entrega.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) || 0) + o.valor_total)
  })
  const mesesOrdenados = [...porMes.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)

  // Peças mais usadas (baseado em movimentações de saída)
  const saidas = movimentacoes.filter((m) => m.tipo === 'saida')
  const usoPorPeca = new Map<string, { nome: string; qtd: number }>()
  saidas.forEach((m) => {
    const nome = m.peca?.nome || 'Peça removida'
    const atual = usoPorPeca.get(m.peca_id) || { nome, qtd: 0 }
    atual.qtd += m.quantidade
    usoPorPeca.set(m.peca_id, atual)
  })
  const topPecas = [...usoPorPeca.values()].sort((a, b) => b.qtd - a.qtd).slice(0, 6)

  const estoqueBaixo = pecas.filter((p) => p.quantidade_estoque <= p.estoque_minimo)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Relatórios</h1>
        <p className="text-ink-soft text-sm mt-1">Indicadores gerais da oficina</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Faturamento total" value={formatMoney(faturamentoTotal)} />
        <Metric label="Ticket médio" value={formatMoney(ticketMedio)} />
        <Metric label="Taxa de conversão" value={`${taxaConversao}%`} sub="orçamento → aprovado" />
        <Metric label="OS entregues" value={entregues.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4">Faturamento por mês</h2>
          <div className="space-y-2">
            {mesesOrdenados.map(([mes, valor]) => {
              const max = Math.max(...mesesOrdenados.map(([, v]) => v), 1)
              return (
                <div key={mes} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-ink-soft w-16">{mes}</span>
                  <div className="flex-1 bg-canvas rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-torque rounded-full" style={{ width: `${(valor / max) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-ink w-24 text-right">{formatMoney(valor)}</span>
                </div>
              )
            })}
            {mesesOrdenados.length === 0 && (
              <p className="text-ink-soft text-sm text-center py-4">Ainda não há OS entregues.</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4">Peças mais usadas</h2>
          <div className="space-y-2">
            {topPecas.map((p) => {
              const max = Math.max(...topPecas.map((x) => x.qtd), 1)
              return (
                <div key={p.nome} className="flex items-center gap-3 text-sm">
                  <span className="text-ink w-32 truncate">{p.nome}</span>
                  <div className="flex-1 bg-canvas rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-steel rounded-full" style={{ width: `${(p.qtd / max) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-ink-soft w-10 text-right">{p.qtd}</span>
                </div>
              )
            })}
            {topPecas.length === 0 && (
              <p className="text-ink-soft text-sm text-center py-4">Nenhuma peça baixada do estoque ainda.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold text-ink text-sm mb-4">Peças abaixo do estoque mínimo</h2>
        <div className="divide-y divide-border">
          {estoqueBaixo.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink">{p.nome}</span>
              <span className="font-mono text-xs text-status-cancelado font-semibold">
                {p.quantidade_estoque} / mín {p.estoque_minimo}
              </span>
            </div>
          ))}
          {estoqueBaixo.length === 0 && <p className="text-ink-soft text-sm py-4 text-center">Estoque saudável.</p>}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-soft font-medium">{label}</p>
      <p className="font-display text-xl font-semibold text-ink mt-1">{value}</p>
      {sub && <p className="text-[10px] text-ink-soft mt-0.5">{sub}</p>}
    </div>
  )
}
