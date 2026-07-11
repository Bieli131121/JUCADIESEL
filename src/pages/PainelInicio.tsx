import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { listPecas, listOrdensServico, listContasReceber, listVeiculos } from '@/lib/db'
import { calcularStatusRevisao } from '@/lib/revisoes'
import { formatMoney, formatDate } from '@/lib/format'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Peca, OrdemServico, ContaReceber, Veiculo } from '@/types/database'

interface Aviso {
  tipo: 'ESTOQUE' | 'OS' | 'FINANCEIRO' | 'REVISÃO'
  data: string
  descricao: string
  link: string
}

const TIPO_COR: Record<Aviso['tipo'], string> = {
  ESTOQUE: 'bg-red-50 text-red-700',
  OS: 'bg-amber-50 text-amber-700',
  FINANCEIRO: 'bg-green-50 text-green-700',
  REVISÃO: 'bg-purple-50 text-purple-700',
}

export default function PainelInicio() {
  const [loading, setLoading] = useState(true)
  const [avisos, setAvisos] = useState<Aviso[]>([])

  useEffect(() => {
    Promise.all([listPecas(), listOrdensServico(), listContasReceber(), listVeiculos()]).then(
      ([pecas, ordens, contas, veiculos]) => {
        setAvisos(montarAvisos(pecas, ordens, contas, veiculos))
        setLoading(false)
      }
    )
  }, [])

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-8">
      <div className="flex-1 flex flex-col items-center justify-center gap-1 bg-surface min-h-[320px] py-10">
        <img src="/branding/logo-jucax.png" alt="JUCAX" className="w-72 max-w-[60%] drop-shadow-sm" />
        <p className="text-ink-soft text-sm mt-2">Sistema de Gestão</p>
        <p className="text-ink-soft/60 text-xs font-mono mt-3">v.1.0.0 · modo: {import.meta.env.VITE_SUPABASE_URL ? 'Supabase conectado' : 'local'}</p>
      </div>

      <div className="border-t border-border bg-surface px-5 py-3">
        <p className="text-xs font-semibold text-ink-soft mb-2 flex items-center gap-1.5">
          <AlertTriangle size={13} /> Avisos e pendências
        </p>
        {loading ? (
          <SkeletonList rows={3} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-soft border-b border-border">
                  <th className="font-medium pb-1.5 pr-4 w-28">Tipo</th>
                  <th className="font-medium pb-1.5 pr-4 w-24">Data</th>
                  <th className="font-medium pb-1.5">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {avisos.map((a, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pr-4">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TIPO_COR[a.tipo]}`}>{a.tipo}</span>
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-ink-soft">{a.data}</td>
                    <td className="py-1.5">
                      <Link to={a.link} className="text-steel hover:underline">
                        {a.descricao}
                      </Link>
                    </td>
                  </tr>
                ))}
                {avisos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-ink-soft">
                      Nenhuma pendência no momento. Tudo em dia! 👍
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function montarAvisos(pecas: Peca[], ordens: OrdemServico[], contas: ContaReceber[], veiculos: Veiculo[]): Aviso[] {
  const avisos: Aviso[] = []
  const hoje = new Date()

  const pecasBaixas = pecas.filter((p) => p.quantidade_estoque <= p.estoque_minimo)
  if (pecasBaixas.length > 0) {
    avisos.push({
      tipo: 'ESTOQUE',
      data: formatDate(hoje.toISOString()),
      descricao: `${pecasBaixas.length} peça${pecasBaixas.length > 1 ? 's' : ''} com estoque abaixo do mínimo — ${pecasBaixas
        .slice(0, 3)
        .map((p) => p.nome)
        .join(', ')}${pecasBaixas.length > 3 ? '...' : ''}`,
      link: '/estoque',
    })
  }

  ordens
    .filter((o) => o.status === 'orcamento')
    .forEach((o) => {
      const dias = Math.floor((hoje.getTime() - new Date(o.data_orcamento).getTime()) / 86400000)
      if (dias >= 2) {
        avisos.push({
          tipo: 'OS',
          data: formatDate(o.data_orcamento),
          descricao: `OS #${o.numero} aguardando aprovação há ${dias} dias — ${o.veiculo?.modelo || ''}, ${o.cliente?.nome || ''}`,
          link: `/ordens-servico/${o.id}`,
        })
      }
    })

  const contasPendentes = contas.filter((c) => {
    if (c.status !== 'pendente' || !c.data_vencimento) return false
    const dias = (new Date(c.data_vencimento).getTime() - hoje.getTime()) / 86400000
    return dias <= 3
  })
  if (contasPendentes.length > 0) {
    const total = contasPendentes.reduce((s, c) => s + c.valor, 0)
    avisos.push({
      tipo: 'FINANCEIRO',
      data: formatDate(hoje.toISOString()),
      descricao: `${contasPendentes.length} conta${contasPendentes.length > 1 ? 's' : ''} a receber vencendo nos próximos 3 dias — total ${formatMoney(total)}`,
      link: '/financeiro',
    })
  }

  veiculos.forEach((v) => {
    if (calcularStatusRevisao(v) === 'atrasada') {
      avisos.push({
        tipo: 'REVISÃO',
        data: formatDate(hoje.toISOString()),
        descricao: `${v.marca || ''} ${v.modelo} (${v.placa}) atingiu o ponto de revisão preventiva`,
        link: '/revisoes',
      })
    }
  })

  return avisos
}
