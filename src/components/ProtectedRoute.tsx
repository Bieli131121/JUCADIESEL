import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/types/database'

export function ProtectedRoute({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { usuario, loading } = useAuth()

  if (loading) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (roles && !roles.includes(usuario.role)) {
    return (
      <div className="p-8 text-center text-ink-soft text-sm">
        Você não tem permissão para acessar esta área.
      </div>
    )
  }
  return <>{children}</>
}
