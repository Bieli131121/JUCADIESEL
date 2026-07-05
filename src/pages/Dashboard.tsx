import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, AlertTriangle, Wallet, CalendarClock } from 'lucide-react'
import { listOrdensServico, listPecas, listContasReceber, listAgendamentos } from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Placa } from '@/components/ui/Placa'
import type { OrdemServico, Peca, ContaReceber, Agendamento } from '@/types/database'

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Dashboard() {
  const [os, setOs] = useState<OrdemServico[]>([])
  const [pecas, setPecas] = useState<Peca[]>([])
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listOrdensServico(), listPecas(), listContasReceber(), listAgendamentos()])
      .then(([o, p, c, a]) => {
        setOs(o)
        setPecas(p)
        setContas(c)
        setAgendamentos(a)
      })
      .finally(() => setLoading(false))
  }, [])

  const osAbertas = os.filter((o) => !['entregue', 'cancelado'].includes(o.status))
  const estoqueBaixo = pecas.filter((p) => p.quantidade_estoque <= p.estoque_minimo)
  const aReceber = contas.filter((c) => c.status === 'pendente')
  const totalAReceber = aReceber.reduce((sum, c) => sum + c.valor, 0)
  const hoje = new Date().toISOString().slice(0, 10)
  const agendamentosHoje = agendamentos.filter((a) => a.data_hora.slice(0, 10) === hoje)

  if (loading) return <div className="text-ink-soft text-sm">Carregando painel...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Painel</h1>
        <p className="text-ink-soft text-sm mt-1">Visão geral da oficina hoje</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wrench} label="OS em aberto" value={osAbertas.length} accent="torque" />
        <StatCard icon={AlertTriangle} label="Peças em falta" value={estoqueBaixo.length} accent="cancelado" />
        <StatCard icon={Wallet} label="A receber" value={formatMoney(totalAReceber)} accent="steel" />
        <StatCard icon={CalendarClock} label="Agendamentos hoje" value={agendamentosHoje.length} accent="concluido" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink">OS em andamento</h2>
            <Link to="/ordens-servico" className="text-xs text-torque font-medium hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {osAbertas.slice(0, 6).map((o) => (
              <Link
                key={o.id}
                to={`/ordens-servico/${o.id}`}
                className="flex items-center justify-between text-sm hover:bg-canvas -mx-2 px-2 py-1.5 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-ink-soft text-xs">#{o.numero}</span>
                  {o.veiculo && <Placa placa={o.veiculo.placa} />}
                  <span className="text-ink truncate">{o.cliente?.nome}</span>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
            {osAbertas.length === 0 && (
              <p className="text-ink-soft text-sm py-4 text-center">Nenhuma OS em aberto no momento.</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink">Estoque em alerta</h2>
            <Link to="/estoque" className="text-xs text-torque font-medium hover:underline">
              Ver estoque
            </Link>
          </div>
          <div className="space-y-3">
            {estoqueBaixo.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{p.nome}</span>
                <span className="font-mono text-xs text-status-cancelado font-semibold">
                  {p.quantidade_estoque} / min {p.estoque_minimo}
                </span>
              </div>
            ))}
            {estoqueBaixo.length === 0 && (
              <p className="text-ink-soft text-sm py-4 text-center">Estoque saudável. Nada abaixo do mínimo.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-ink-soft mb-2">
        <Icon size={16} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="font-display text-xl font-semibold text-ink">{value}</div>
    </div>
  )
}
