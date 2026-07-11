import { useEffect, useState } from 'react'
import { FileDown, FileSpreadsheet, Printer } from 'lucide-react'
import {
  listOrdensServico,
  listPecas,
  listMovimentacoesEstoque,
  listClientes,
  listVeiculos,
  listContasReceber,
  listContasPagar,
  listCaixaMovimentacoes,
} from '@/lib/db'
import { getEmpresaConfig } from '@/lib/db'
import { Button } from '@/components/ui/Button'
import { SkeletonCards, SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { formatMoney } from '@/lib/format'
import type {
  OrdemServico,
  Peca,
  MovimentacaoEstoque,
  Cliente,
  Veiculo,
  ContaReceber,
  ContaPagar,
  CaixaMovimentacao,
} from '@/types/database'

export default function Relatorios() {
  const { showToast } = useToast()
  const [os, setOs] = useState<OrdemServico[]>([])
  const [pecas, setPecas] = useState<Peca[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([])
  const [caixa, setCaixa] = useState<CaixaMovimentacao[]>([])
  const [nomeEmpresa, setNomeEmpresa] = useState('Oficina')
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null)

  useEffect(() => {
    Promise.all([
      listOrdensServico(),
      listPecas(),
      listMovimentacoesEstoque(),
      listClientes(),
      listVeiculos(),
      listContasReceber(),
      listContasPagar(),
      listCaixaMovimentacoes(),
      getEmpresaConfig(),
    ]).then(([o, p, m, c, v, cr, cp, cx, config]) => {
      setOs(o)
      setPecas(p)
      setMovimentacoes(m)
      setClientes(c)
      setVeiculos(v)
      setContasReceber(cr)
      setContasPagar(cp)
      setCaixa(cx)
      setNomeEmpresa(config?.nome_fantasia || 'Oficina')
      setLoading(false)
    })
  }, [])

  if (loading)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Relatórios</h1>
          <p className="text-ink-soft text-sm mt-1">Indicadores gerais da oficina</p>
        </div>
        <SkeletonCards count={4} />
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonList rows={4} />
          <SkeletonList rows={4} />
        </div>
      </div>
    )

  const entregues = os.filter((o) => o.status === 'entregue')
  const faturamentoTotal = entregues.reduce((s, o) => s + o.valor_total, 0)
  const ticketMedio = entregues.length ? faturamentoTotal / entregues.length : 0
  const criadas = os.filter((o) => o.status !== 'orcamento').length
  const totalOS = os.length
  const taxaConversao = totalOS ? Math.round((criadas / totalOS) * 100) : 0

  // Custo estimado das peças usadas (saídas por OS) + despesas registradas no caixa
  const custoPecas = movimentacoes
    .filter((m) => m.tipo === 'saida' && m.os_id)
    .reduce((s, m) => s + (m.peca?.preco_custo || 0) * m.quantidade, 0)
  const despesasCaixa = caixa.filter((c) => c.tipo === 'saida').reduce((s, c) => s + c.valor, 0)
  const lucroEstimado = faturamentoTotal - custoPecas - despesasCaixa

  // Faturamento por mês
  const porMes = new Map<string, number>()
  entregues.forEach((o) => {
    if (!o.data_entrega) return
    const mes = o.data_entrega.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) || 0) + o.valor_total)
  })
  const mesesOrdenados = [...porMes.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)

  // Peças mais usadas
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

  // Distribuição de OS por status
  const statusMap = new Map<string, number>()
  os.forEach((o) => statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1))

  function montarDadosExportacao() {
    return {
      nomeEmpresa,
      os,
      clientes,
      veiculos,
      pecas,
      contasReceber,
      contasPagar,
      faturamentoTotal,
      ticketMedio,
      taxaConversao,
      lucroEstimado,
    }
  }

  async function exportarPDF() {
    setExportando('pdf')
    try {
      const { exportarRelatorioPDF } = await import('@/lib/exportUtils')
      exportarRelatorioPDF(montarDadosExportacao())
      showToast('PDF gerado com sucesso.', 'success')
    } catch {
      showToast('Não foi possível gerar o PDF.', 'error')
    } finally {
      setExportando(null)
    }
  }

  async function exportarExcel() {
    setExportando('excel')
    try {
      const { exportarRelatorioExcel } = await import('@/lib/exportUtils')
      exportarRelatorioExcel(montarDadosExportacao())
      showToast('Excel gerado com sucesso.', 'success')
    } catch {
      showToast('Não foi possível gerar o Excel.', 'error')
    } finally {
      setExportando(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Relatórios</h1>
          <p className="text-ink-soft text-sm mt-1">Indicadores gerais da oficina</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="secondary" size="sm" icon={<FileDown size={14} />} onClick={exportarPDF} loading={exportando === 'pdf'}>
            Exportar PDF
          </Button>
          <Button variant="secondary" size="sm" icon={<FileSpreadsheet size={14} />} onClick={exportarExcel} loading={exportando === 'excel'}>
            Exportar Excel
          </Button>
          <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Faturamento total" value={formatMoney(faturamentoTotal)} />
        <Metric label="Ticket médio" value={formatMoney(ticketMedio)} />
        <Metric label="Lucro estimado" value={formatMoney(lucroEstimado)} sub="faturamento - custo peças - despesas" />
        <Metric label="Taxa de conversão" value={`${taxaConversao}%`} sub="orçamento → aprovado" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total de clientes" value={clientes.length} />
        <Metric label="Total de veículos" value={veiculos.length} />
        <Metric label="OS entregues" value={entregues.length} />
        <Metric label="Peças cadastradas" value={pecas.length} />
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
            {mesesOrdenados.length === 0 && <p className="text-ink-soft text-sm text-center py-4">Ainda não há OS entregues.</p>}
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
            {topPecas.length === 0 && <p className="text-ink-soft text-sm text-center py-4">Nenhuma peça baixada do estoque ainda.</p>}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold text-ink text-sm mb-4">Distribuição de OS por status</h2>
        <div className="flex flex-wrap gap-4">
          {[...statusMap.entries()].map(([status, qtd]) => (
            <div key={status} className="flex items-center gap-2 text-sm">
              <span className="font-mono font-semibold text-ink">{qtd}</span>
              <span className="text-ink-soft capitalize">{status.replace('_', ' ')}</span>
            </div>
          ))}
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
