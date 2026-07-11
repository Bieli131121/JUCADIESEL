import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Car,
  Wrench,
  Package,
  Wallet,
  CalendarClock,
  BarChart3,
  Settings,
  X,
  LogOut,
  Sun,
  Moon,
  Search,
  UserCog,
  Truck,
  ShoppingCart,
  MessageSquare,
  ChevronDown,
  FolderCog,
} from 'lucide-react'
import type { EmpresaConfig, Role } from '@/types/database'
import { ROLE_LABELS } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

type NavLinkItem = { type: 'link'; to: string; label: string; icon: any; end?: boolean; roles?: Role[] }
type NavGroupItem = { type: 'group'; label: string; roles?: Role[]; items: { to: string; label: string; icon: any; roles?: Role[] }[] }
type NavEntry = NavLinkItem | NavGroupItem

const NAV_ITEMS: NavEntry[] = [
  { type: 'link', to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { type: 'link', to: '/ordens-servico', label: 'Ordens de Serviço', icon: Wrench },
  {
    type: 'group',
    label: 'Cadastros',
    roles: ['admin', 'recepcao', 'gerente', 'financeiro'],
    items: [
      { to: '/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'recepcao', 'gerente', 'financeiro'] },
      { to: '/veiculos', label: 'Veículos', icon: Car, roles: ['admin', 'recepcao', 'gerente', 'financeiro'] },
      { to: '/mecanicos', label: 'Mecânicos', icon: UserCog, roles: ['admin', 'gerente'] },
      { to: '/fornecedores', label: 'Fornecedores', icon: Truck, roles: ['admin', 'gerente'] },
    ],
  },
  { type: 'link', to: '/estoque', label: 'Estoque', icon: Package, roles: ['admin', 'mecanico', 'gerente'] },
  { type: 'link', to: '/ordens-compra', label: 'Ordens de Compra', icon: ShoppingCart, roles: ['admin', 'gerente'] },
  { type: 'link', to: '/revisoes', label: 'Revisões', icon: Wrench, roles: ['admin', 'recepcao', 'gerente'] },
  { type: 'link', to: '/relatorios', label: 'Relatórios', icon: BarChart3, roles: ['admin', 'gerente', 'financeiro'] },
  { type: 'link', to: '/financeiro', label: 'Financeiro', icon: Wallet, roles: ['admin', 'recepcao', 'gerente', 'financeiro'] },
  { type: 'link', to: '/agendamento', label: 'Agendamento', icon: CalendarClock, roles: ['admin', 'recepcao', 'gerente'] },
  { type: 'link', to: '/mensagens-whatsapp', label: 'Mensagens WhatsApp', icon: MessageSquare, roles: ['admin', 'recepcao', 'gerente'] },
  { type: 'link', to: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  config: EmpresaConfig | null
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ config, isMobileOpen, onCloseMobile }: SidebarProps) {
  const { usuario, logout } = useAuth()
  const { tema, alternarTema } = useTheme()
  const location = useLocation()
  const nome = config?.nome_fantasia || 'Minha Oficina'
  const logo = config?.logo_url || '/branding/logo-jucax.png'

  // Cada grupo (ex: "Cadastros") começa aberto sozinho se a rota atual for
  // uma das opções dele — assim, se você estiver em "Veículos", o grupo já
  // aparece expandido em vez de esconder onde você está.
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(() => {
    const iniciais: Record<string, boolean> = {}
    for (const entry of NAV_ITEMS) {
      if (entry.type === 'group') {
        iniciais[entry.label] = entry.items.some((i) => location.pathname.startsWith(i.to))
      }
    }
    return iniciais
  })

  function alternarGrupo(label: string) {
    setGruposAbertos((atual) => ({ ...atual, [label]: !atual[label] }))
  }

  function podeVer(roles?: Role[]) {
    return !roles || (usuario && roles.includes(usuario.role))
  }

  const linkClasse = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
    }`

  const linkClasseSub = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
    }`

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

        <div className="px-3 pt-3">
          <button
            onClick={() => window.dispatchEvent(new Event('abrir-busca-global'))}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 border border-white/10 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Search size={15} />
            Buscar...
            <span className="ml-auto text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded">Ctrl K</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((entry) => {
            if (entry.type === 'link') {
              if (!podeVer(entry.roles)) return null
              return (
                <NavLink key={entry.to} to={entry.to} end={entry.end} onClick={onCloseMobile} className={linkClasse}>
                  <entry.icon size={18} />
                  {entry.label}
                </NavLink>
              )
            }

            // Grupo (ex: "Cadastros") — só aparece se tiver ao menos um item visível pro perfil atual
            const itensVisiveis = entry.items.filter((i) => podeVer(i.roles))
            if (!podeVer(entry.roles) || itensVisiveis.length === 0) return null

            const aberto = !!gruposAbertos[entry.label]

            return (
              <div key={entry.label} className="pt-1">
                <button
                  onClick={() => alternarGrupo(entry.label)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <FolderCog size={18} />
                  {entry.label}
                  <ChevronDown size={15} className={`ml-auto transition-transform ${aberto ? 'rotate-180' : ''}`} />
                </button>
                {aberto && (
                  <div className="space-y-1 mt-1">
                    {itensVisiveis.map((item) => (
                      <NavLink key={item.to} to={item.to} onClick={onCloseMobile} className={linkClasseSub}>
                        <item.icon size={16} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="px-3">
          <button
            onClick={alternarTema}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
            {tema === 'claro' ? 'Modo escuro' : 'Modo claro'}
          </button>
        </div>

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
