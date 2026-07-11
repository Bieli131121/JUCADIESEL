import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Sun, Moon, ChevronDown } from 'lucide-react'
import type { Role } from '@/types/database'
import { ROLE_LABELS } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

interface MenuEntry {
  label: string
  to?: string
  roles?: Role[]
  submenu?: { label: string; to: string; roles?: Role[] }[]
}

const MENU_ITEMS: MenuEntry[] = [
  {
    label: 'Cadastros',
    roles: ['admin', 'recepcao', 'gerente', 'financeiro'],
    submenu: [
      { label: 'Clientes', to: '/clientes', roles: ['admin', 'recepcao', 'gerente', 'financeiro'] },
      { label: 'Veículos', to: '/veiculos', roles: ['admin', 'recepcao', 'gerente', 'financeiro'] },
      { label: 'Mecânicos', to: '/mecanicos', roles: ['admin', 'gerente'] },
      { label: 'Fornecedores', to: '/fornecedores', roles: ['admin', 'gerente'] },
    ],
  },
  { label: 'Ordens de Serviço', to: '/ordens-servico' },
  { label: 'Estoque', to: '/estoque', roles: ['admin', 'mecanico', 'gerente'] },
  { label: 'Ordens de Compra', to: '/ordens-compra', roles: ['admin', 'gerente'] },
  { label: 'Revisões', to: '/revisoes', roles: ['admin', 'recepcao', 'gerente'] },
  { label: 'Financeiro', to: '/financeiro', roles: ['admin', 'recepcao', 'gerente', 'financeiro'] },
  { label: 'Agendamento', to: '/agendamento', roles: ['admin', 'recepcao', 'gerente'] },
  { label: 'Relatórios', to: '/relatorios', roles: ['admin', 'gerente', 'financeiro'] },
  { label: 'WhatsApp', to: '/mensagens-whatsapp', roles: ['admin', 'recepcao', 'gerente'] },
  { label: 'Configurações', to: '/configuracoes', roles: ['admin'] },
]

export function MenuBar() {
  const { usuario, logout } = useAuth()
  const { tema, alternarTema } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuAberto(null)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  function podeVer(roles?: Role[]) {
    return !roles || (usuario && roles.includes(usuario.role))
  }

  function irPara(to: string) {
    navigate(to)
    setMenuAberto(null)
  }

  const itensVisiveis = MENU_ITEMS.filter((item) => podeVer(item.roles))

  return (
    <div ref={ref} className="flex items-center h-9 bg-surface border-b border-border px-2 text-[13px] overflow-x-auto shrink-0">
      <button onClick={() => irPara('/')} className="w-6 h-6 rounded overflow-hidden shrink-0 mr-2 ml-1" title="Ir para o Painel">
        <img
          src="/branding/logo-jucax.png"
          alt="JUCAX"
          className="w-full h-full object-cover"
          style={{ objectPosition: '78% 38%', transform: 'scale(2.6)' }}
        />
      </button>
      <div className="w-px h-5 bg-border mr-1 shrink-0" />
      {itensVisiveis.map((item) => {
        const subVisivel = item.submenu?.filter((s) => podeVer(s.roles))
        const rotaAtual = item.to === '/' ? location.pathname === '/' : item.to && location.pathname.startsWith(item.to)
        const ativo = menuAberto === item.label || rotaAtual || (subVisivel?.some((s) => location.pathname.startsWith(s.to)) ?? false)

        return (
          <div key={item.label} className="relative shrink-0">
            <button
              onClick={() => (item.to ? irPara(item.to) : setMenuAberto(menuAberto === item.label ? null : item.label))}
              className={`px-3 h-9 flex items-center gap-1 whitespace-nowrap transition-colors ${
                ativo ? 'text-torque font-medium' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {item.label}
              {item.submenu && <ChevronDown size={12} className={menuAberto === item.label ? 'rotate-180' : ''} />}
            </button>
            {item.submenu && menuAberto === item.label && subVisivel && subVisivel.length > 0 && (
              <div className="absolute top-full left-0 bg-surface border border-border rounded-lg shadow-lg py-1.5 min-w-[160px] z-30">
                {subVisivel.map((s) => (
                  <button
                    key={s.to}
                    onClick={() => irPara(s.to)}
                    className={`w-full text-left px-3.5 py-2 text-[13px] hover:bg-canvas transition-colors ${
                      location.pathname.startsWith(s.to) ? 'text-torque font-medium' : 'text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div className="ml-auto flex items-center gap-1 pl-3 shrink-0">
        <button onClick={alternarTema} className="p-1.5 rounded-lg text-ink-soft hover:bg-canvas hover:text-ink" title="Alternar tema">
          {tema === 'claro' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        {usuario && (
          <>
            <span className="text-xs text-ink-soft px-2 hidden sm:inline">
              {usuario.nome} · <span className="text-ink-soft/70">{ROLE_LABELS[usuario.role]}</span>
            </span>
            <button onClick={logout} className="p-1.5 rounded-lg text-ink-soft hover:bg-canvas hover:text-status-cancelado" title="Sair">
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
