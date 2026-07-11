import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { autenticar } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'

export default function Login() {
  const [usuario, setUsuario] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)
  const { login } = useAuth()
  const { config } = useEmpresaConfig()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!usuario || !pin) return
    setEntrando(true)
    try {
      const encontrado = await autenticar(usuario, pin)
      if (!encontrado) {
        setErro('Usuário ou PIN incorretos.')
        return
      }
      login(encontrado)
      navigate('/')
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível entrar. Tente novamente.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img
            src={config?.logo_url || '/branding/logo-jucax.png'}
            alt="Logo"
            className="w-64 drop-shadow-sm"
          />
          <p className="text-ink-soft text-xs mt-1">Sistema de Gestão</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4 border border-border shadow-sm">
          <div>
            <label className="label-field">Usuário</label>
            <input
              className="input-field"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="ex: admin"
            />
          </div>
          <div>
            <label className="label-field">PIN</label>
            <input
              className="input-field font-mono tracking-widest"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
            />
          </div>
          {erro && <p className="text-status-cancelado text-xs font-medium">{erro}</p>}
          <button className="btn-primary w-full" disabled={entrando}>
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
