import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Wrench,
  Package,
  Wallet,
  CalendarClock,
  BarChart3,
  Settings,
  X,
} from 'lucide-react'
import type { EmpresaConfig } from '@/types/database'

const NAV_ITEMS = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/ordens-servico', label: 'Ordens de Serviço', icon: Wrench },
  { to: '/clientes', label: 'Clientes e Veículos', icon: Users },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/agendamento', label: 'Agendamento', icon: CalendarClock },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  config: EmpresaConfig | null
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ config, isMobileOpen, onCloseMobile }: SidebarProps) {
  const nome = config?.nome_fantasia || 'Minha Oficina'

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-graphite text-white flex flex-col z-40 transition-transform duration-200 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          {config?.logo_url ? (
            <img src={config.logo_url} alt={nome} className="w-8 h-8 rounded object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded flex items-center justify-center font-display font-bold text-sm"
              style={{ backgroundColor: config?.cor_primaria || '#F2600C' }}
            >
              {nome.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-display font-semibold text-sm truncate">{nome}</span>
          <button className="ml-auto lg:hidden text-white/60" onClick={onCloseMobile}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 text-xs text-white/40">
          Sistema de Gestão · Oficina
        </div>
      </aside>
    </>
  )
}
