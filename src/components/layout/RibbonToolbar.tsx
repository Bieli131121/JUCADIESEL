import { useNavigate, useLocation } from 'react-router-dom'
import { Users, Car, UserCog, Truck, Wrench, Package, ShoppingCart, Wallet, CalendarClock, ArrowRight, LayoutDashboard, BarChart3, PieChart } from 'lucide-react'
import type { Role } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface RibbonButton {
  label: string
  to: string
  icon: typeof Users
  roles?: Role[]
  colorClass: string
}

const GRUPO_CADASTROS: RibbonButton[] = [
  { label: 'Clientes', to: '/clientes', icon: Users, roles: ['admin', 'recepcao', 'gerente', 'financeiro'], colorClass: 'bg-steel-light text-steel' },
  { label: 'Veículos', to: '/veiculos', icon: Car, roles: ['admin', 'recepcao', 'gerente', 'financeiro'], colorClass: 'bg-amber-50 text-amber-700' },
  { label: 'Mecânicos', to: '/mecanicos', icon: UserCog, roles: ['admin', 'gerente'], colorClass: 'bg-purple-50 text-purple-700' },
  { label: 'Fornecedores', to: '/fornecedores', icon: Truck, roles: ['admin', 'gerente'], colorClass: 'bg-green-50 text-green-700' },
]

const GRUPO_OPERACAO: RibbonButton[] = [
  { label: 'Nova OS', to: '/ordens-servico', icon: Wrench, colorClass: 'bg-torque-light text-torque-dark' },
  { label: 'Estoque', to: '/estoque', icon: Package, roles: ['admin', 'mecanico', 'gerente'], colorClass: 'bg-steel-light text-steel' },
  { label: 'Compras', to: '/ordens-compra', icon: ShoppingCart, roles: ['admin', 'gerente'], colorClass: 'bg-green-50 text-green-700' },
]

const GRUPO_FINANCEIRO: RibbonButton[] = [
  { label: 'Financeiro', to: '/financeiro', icon: Wallet, roles: ['admin', 'recepcao', 'gerente', 'financeiro'], colorClass: 'bg-green-50 text-green-700' },
  { label: 'Agenda', to: '/agendamento', icon: CalendarClock, roles: ['admin', 'recepcao', 'gerente'], colorClass: 'bg-purple-50 text-purple-700' },
]

const GRUPO_ATALHOS: RibbonButton[] = [
  { label: 'Painel', to: '/', icon: LayoutDashboard, colorClass: 'bg-graphite text-torque' },
  { label: 'Indicadores', to: '/indicadores', icon: BarChart3, roles: ['admin', 'gerente', 'financeiro'], colorClass: 'bg-graphite text-torque' },
  { label: 'DRE', to: '/financeiro?aba=dre', icon: PieChart, roles: ['admin', 'gerente', 'financeiro'], colorClass: 'bg-graphite text-torque' },
]

function BotaoRibbon({ item }: { item: RibbonButton }) {
  const navigate = useNavigate()
  const location = useLocation()
  const caminhoBase = item.to.split('?')[0]
  const ativo = caminhoBase === '/' ? location.pathname === '/' : location.pathname.startsWith(caminhoBase)
  const Icon = item.icon

  return (
    <button
      onClick={() => navigate(item.to)}
      className={`flex flex-col items-center gap-1.5 px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
        ativo ? 'bg-canvas' : 'hover:bg-canvas'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.colorClass}`}>
        <Icon size={16} />
      </div>
      <span className="text-[10.5px] font-medium text-ink whitespace-nowrap">{item.label}</span>
    </button>
  )
}

export function RibbonToolbar() {
  const { usuario } = useAuth()

  function podeVer(roles?: Role[]) {
    return !roles || (usuario && roles.includes(usuario.role))
  }

  const cadastros = GRUPO_CADASTROS.filter((i) => podeVer(i.roles))
  const operacao = GRUPO_OPERACAO.filter((i) => podeVer(i.roles))
  const financeiro = GRUPO_FINANCEIRO.filter((i) => podeVer(i.roles))
  const atalhos = GRUPO_ATALHOS.filter((i) => podeVer(i.roles))

  return (
    <div className="flex items-stretch gap-0.5 bg-surface border-b border-border px-3 py-1.5 overflow-x-auto shrink-0">
      {cadastros.map((item) => (
        <BotaoRibbon key={item.to} item={item} />
      ))}

      {cadastros.length > 0 && operacao.length > 0 && (
        <div className="flex items-center px-2 text-torque shrink-0">
          <ArrowRight size={16} />
        </div>
      )}

      {operacao.map((item) => (
        <BotaoRibbon key={item.to} item={item} />
      ))}

      {financeiro.length > 0 && <div className="w-px bg-border mx-2 my-1 shrink-0" />}

      {financeiro.map((item) => (
        <BotaoRibbon key={item.to} item={item} />
      ))}

      {atalhos.length > 0 && (
        <>
          <div className="ml-auto w-px bg-border mx-2 my-1 shrink-0" />
          {atalhos.map((item) => (
            <BotaoRibbon key={item.to} item={item} />
          ))}
        </>
      )}
    </div>
  )
}
