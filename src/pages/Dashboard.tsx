import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Car,
  Wrench,
  CheckCircle2,
  Wallet,
  TrendingUp,
  Package,
  AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  listOrdensServico,
  listPecas,
  listClientes,
  listVeiculos,
  listMecanicos,
  listTodosItensOS,
} from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Placa } from '@/components/ui/Placa'
import { SkeletonCards, SkeletonList } from '@/components/ui/Skeleton'
import type { OrdemServico, Peca, Cliente, Veiculo, Mecanico, OSItem } from '@/types/database'
import { formatMoney } from '@/lib/format'

function formatMoneyShort(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`
  return `R$ ${v.toFixed(0)}`
}

function nomeMes(chave: string) {
  const [ano, mes] = chave.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`
}

function ultimosNMeses(n: number) {
  const chaves: string[] = []
  const hoje = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return chaves
}

export default function Dashboard() {
  const [os, setOs] = useState<OrdemServico[]>([])
  const [pecas, setPecas] = useState<Peca[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [itens, setItens] = useState<OSItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      listOrdensServico(),
      listPecas(),
      listClientes(),
      listVeiculos(),
      listMecanicos(),
      listTodosItensOS(),
    ]).then(([o, p, c, v, m, i]) => {
      setOs(o)
      setPecas(p)
      setClientes(c)
      setVeiculos(v)
      setMecanicos(m)
      setItens(i)
      setLoading(false)
    })
  }, [])

  if (loading)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Painel</h1>
          <p className="text-ink-soft text-sm mt-1">Visão geral da oficina</p>
        </div>
        <SkeletonCards count={4} />
        <SkeletonCards count={4} />
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonList rows={4} />
          <SkeletonList rows={4} />
        </div>
      </div>
    )

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const anoAtual = hoje.getFullYear()

  const osAbertas = os.filter((o) => !['entregue', 'cancelado'].includes(o.status))
  const osFinalizadas = os.filter((o) => o.status === 'entregue')
  const estoqueBaixo = pecas.filter((p) => p.quantidade_estoque <= p.estoque_minimo)
  const totalUnidadesEstoque = pecas.reduce((s, p) => s + p.quantidade_estoque, 0)

  const faturamentoMes = os
    .filter((o) => o.status === 'entregue' && o.data_entrega?.slice(0, 7) === mesAtual)
    .reduce((s, o) => s + o.valor_total, 0)

  const faturamentoAno = os
    .filter((o) => o.status === 'entregue' && o.data_entrega?.slice(0, 4) === String(anoAtual))
    .reduce((s, o) => s + o.valor_total, 0)

  // Gráfico: faturamento dos últimos 6 meses
  const meses6 = ultimosNMeses(6)
  const faturamentoPorMes = meses6.map((chave) => {
    const total = os
      .filter((o) => o.status === 'entregue' && o.data_entrega?.slice(0, 7) === chave)
      .reduce((s, o) => s + o.valor_total, 0)
    return { mes: nomeMes(chave), valor: total }
  })

  // Gráfico: quantidade de OS criadas por mês (últimos 6 meses)
  const osPorMes = meses6.map((chave) => {
    const total = os.filter((o) => o.data_orcamento?.slice(0, 7) === chave).length
    return { mes: nomeMes(chave), quantidade: total }
  })

  // Serviços mais vendidos (por quantidade, apenas itens tipo "servico")
  const servicosMap = new Map<string, number>()
  itens
    .filter((i) => i.tipo === 'servico')
    .forEach((i) => {
      servicosMap.set(i.descricao, (servicosMap.get(i.descricao) || 0) + i.quantidade)
    })
  const topServicos = [...servicosMap.entries()]
    .map(([descricao, quantidade]) => ({ descricao, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)

  // Mecânicos com mais atendimentos
  const mecanicoMap = new Map<string, number>()
  os.forEach((o) => {
    if (!o.mecanico_id) return
    mecanicoMap.set(o.mecanico_id, (mecanicoMap.get(o.mecanico_id) || 0) + 1)
  })
  const topMecanicos = [...mecanicoMap.entries()]
    .map(([id, total]) => ({ nome: mecanicos.find((m) => m.id === id)?.nome || 'Removido', total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const ultimosClientes = [...clientes]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)

  const ultimasOrdens = [...os].sort((a, b) => b.numero - a.numero).slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Painel</h1>
        <p className="text-ink-soft text-sm mt-1">Visão geral da oficina</p>
      </div>

      {clientes.length === 0 && pecas.length === 0 && os.length === 0 && (
        <div className="card p-5 bg-torque-light border-torque/20">
          <p className="font-display font-semibold text-ink mb-1">Bem-vindo! Vamos começar</p>
          <p className="text-sm text-ink-soft mb-3">
            Seu sistema ainda está vazio. Sugestão de ordem pra configurar tudo rapidinho:
          </p>
          <ol className="text-sm text-ink space-y-1 list-decimal list-inside">
            <li><Link to="/mecanicos" className="text-torque font-medium hover:underline">Cadastre seus mecânicos</Link></li>
            <li><Link to="/estoque" className="text-torque font-medium hover:underline">Cadastre suas peças</Link> (ou importe uma nota fiscal de compra)</li>
            <li><Link to="/clientes" className="text-torque font-medium hover:underline">Cadastre um cliente</Link></li>
            <li><Link to="/veiculos" className="text-torque font-medium hover:underline">Cadastre o veículo dele</Link></li>
            <li><Link to="/ordens-servico" className="text-torque font-medium hover:underline">Abra sua primeira Ordem de Serviço</Link></li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total de clientes" value={clientes.length} />
        <StatCard icon={Car} label="Total de veículos" value={veiculos.length} />
        <StatCard icon={Wrench} label="OS em aberto" value={osAbertas.length} />
        <StatCard icon={CheckCircle2} label="OS finalizadas" value={osFinalizadas.length} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Faturamento do mês" value={formatMoney(faturamentoMes)} accent="torque" />
        <StatCard icon={TrendingUp} label="Faturamento anual" value={formatMoney(faturamentoAno)} accent="steel" />
        <StatCard icon={Package} label="Peças em estoque" value={totalUnidadesEstoque} />
        <StatCard
          icon={AlertTriangle}
          label="Produtos com estoque baixo"
          value={estoqueBaixo.length}
          accent={estoqueBaixo.length > 0 ? 'cancelado' : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4">Faturamento (últimos 6 meses)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={faturamentoPorMes} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="corFaturamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F2600C" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F2600C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE1E6" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#5B6270' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#5B6270' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatMoneyShort}
                width={50}
              />
              <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="valor" stroke="#F2600C" strokeWidth={2} fill="url(#corFaturamento)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4">OS criadas por mês</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={osPorMes} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE1E6" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#5B6270' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#5B6270' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="quantidade" fill="#2D6E8E" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RankingCard title="Serviços mais vendidos" items={topServicos.map((s) => ({ label: s.descricao, valor: s.quantidade }))} corBarra="bg-torque" />
        <RankingCard title="Mecânicos com mais atendimentos" items={topMecanicos.map((m) => ({ label: m.nome, valor: m.total }))} corBarra="bg-steel" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink text-sm">Últimos clientes cadastrados</h2>
            <Link to="/clientes" className="text-xs text-torque font-medium hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {ultimosClientes.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{c.nome}</span>
                <span className="text-ink-soft text-xs font-mono">{c.telefone}</span>
              </div>
            ))}
            {ultimosClientes.length === 0 && (
              <p className="text-ink-soft text-sm py-4 text-center">Nenhum cliente cadastrado ainda.</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink text-sm">Últimas ordens</h2>
            <Link to="/ordens-servico" className="text-xs text-torque font-medium hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {ultimasOrdens.map((o) => (
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
            {ultimasOrdens.length === 0 && (
              <p className="text-ink-soft text-sm py-4 text-center">Nenhuma OS registrada ainda.</p>
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
  accent?: 'torque' | 'steel' | 'cancelado'
}) {
  const valueColor =
    accent === 'torque' ? 'text-torque' : accent === 'steel' ? 'text-steel' : accent === 'cancelado' ? 'text-status-cancelado' : 'text-ink'
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-ink-soft mb-2">
        <Icon size={16} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`font-display text-xl font-semibold ${valueColor}`}>{value}</div>
    </div>
  )
}

function RankingCard({
  title,
  items,
  corBarra,
}: {
  title: string
  items: { label: string; valor: number }[]
  corBarra: string
}) {
  const max = Math.max(...items.map((i) => i.valor), 1)
  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold text-ink text-sm mb-4">{title}</h2>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            <span className="text-ink w-36 truncate">{item.label}</span>
            <div className="flex-1 bg-canvas rounded-full h-2 overflow-hidden">
              <div className={`h-full ${corBarra} rounded-full`} style={{ width: `${(item.valor / max) * 100}%` }} />
            </div>
            <span className="font-mono text-xs text-ink-soft w-8 text-right">{item.valor}</span>
          </div>
        ))}
        {items.length === 0 && <p className="text-ink-soft text-sm py-4 text-center">Sem dados suficientes ainda.</p>}
      </div>
    </div>
  )
}
