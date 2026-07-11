import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MenuBar } from './MenuBar'
import { RibbonToolbar } from './RibbonToolbar'
import { StatusBar } from './StatusBar'
import { GlobalSearch } from '@/components/GlobalSearch'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, usuario } = useAuth()
  const { showToast } = useToast()

  useIdleTimer(30, () => {
    if (!usuario) return
    logout()
    showToast('Sessão encerrada por inatividade.', 'info')
    navigate('/login')
  })

  return (
    <div className="flex flex-col h-screen bg-canvas">
      <MenuBar />
      <RibbonToolbar />
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
      <StatusBar />
      <GlobalSearch />
    </div>
  )
}
