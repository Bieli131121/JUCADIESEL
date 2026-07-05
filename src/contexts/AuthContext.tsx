import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { obterSessao, encerrarSessao, garantirAdminInicial } from '@/lib/auth'
import type { Usuario, Role } from '@/types/database'

interface AuthContextType {
  usuario: Usuario | null
  loading: boolean
  login: (u: Usuario) => void
  logout: () => void
  temPermissao: (roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      await garantirAdminInicial().catch(() => null)
      setUsuario(obterSessao())
      setLoading(false)
    }
    init()
  }, [])

  function login(u: Usuario) {
    setUsuario(u)
  }

  function logout() {
    encerrarSessao()
    setUsuario(null)
  }

  function temPermissao(roles: Role[]) {
    if (!usuario) return false
    return roles.includes(usuario.role)
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, temPermissao }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
