import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { supabaseConfigured } from '@/lib/supabase'

const TITLES: Record<string, string> = {
  '/': 'Painel',
  '/ordens-servico': 'Ordens de Serviço',
  '/clientes': 'Clientes e Veículos',
  '/estoque': 'Estoque',
  '/financeiro': 'Financeiro',
  '/agendamento': 'Agendamento',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { config } = useEmpresaConfig()
  const location = useLocation()
  const title = TITLES[location.pathname] || 'Sistema'

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar config={config} isMobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenMenu={() => setMobileOpen(true)} title={title} />
        {!supabaseConfigured && (
          <div className="bg-torque-light text-torque-dark text-xs font-medium px-4 py-2 text-center">
            Modo local ativo — dados salvos apenas neste dispositivo. Configure o Supabase para sincronizar.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
