import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { autenticar } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const [usuario, setUsuario] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)
  const { login } = useAuth()
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
    } catch {
      setErro('Não foi possível entrar. Tente novamente.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <img src="/branding/logo-jucax.png" alt="Logo" className="w-40 mb-2" />
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
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
          <p className="text-[11px] text-ink-soft text-center pt-1">
            Primeiro acesso? Usuário <span className="font-mono">admin</span> · PIN{' '}
            <span className="font-mono">1234</span> — troque depois em Configurações.
          </p>
        </form>
      </div>
    </div>
  )
}
