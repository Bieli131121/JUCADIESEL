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
  LogOut,
} from 'lucide-react'
import type { EmpresaConfig, Role } from '@/types/database'
import { ROLE_LABELS } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS: { to: string; label: string; icon: any; end?: boolean; roles?: Role[] }[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/ordens-servico', label: 'Ordens de Serviço', icon: Wrench },
  { to: '/clientes', label: 'Clientes e Veículos', icon: Users, roles: ['admin', 'recepcao'] },
  { to: '/estoque', label: 'Estoque', icon: Package, roles: ['admin', 'mecanico'] },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, roles: ['admin', 'recepcao'] },
  { to: '/agendamento', label: 'Agendamento', icon: CalendarClock, roles: ['admin', 'recepcao'] },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, roles: ['admin'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  config: EmpresaConfig | null
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ config, isMobileOpen, onCloseMobile }: SidebarProps) {
  const { usuario, logout } = useAuth()
  const nome = config?.nome_fantasia || 'Minha Oficina'
  const logo = config?.logo_url || '/branding/logo-jucax.png'

  const itemsVisiveis = NAV_ITEMS.filter((item) => !item.roles || (usuario && item.roles.includes(usuario.role)))

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
          <img src={logo} alt={nome} className="h-9 object-contain" />
          <button className="ml-auto lg:hidden text-white/60" onClick={onCloseMobile}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {itemsVisiveis.map(({ to, label, icon: Icon, end }) => (
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

        {usuario && (
          <div className="px-4 py-3 border-t border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{usuario.nome}</p>
                <p className="text-[11px] text-white/40">{ROLE_LABELS[usuario.role]}</p>
              </div>
              <button
                onClick={logout}
                className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
