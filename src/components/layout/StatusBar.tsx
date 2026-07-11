import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/types/database'

const HORARIO_CONEXAO = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function StatusBar() {
  const { usuario } = useAuth()
  const [versao] = useState('1.0.0')

  return (
    <div className="flex items-center gap-4 h-6 px-3 bg-canvas border-t border-border text-[11px] text-ink-soft shrink-0">
      {usuario && (
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-status-entregue" />
          Usuário: <b className="text-ink font-medium">{usuario.nome}</b> ({ROLE_LABELS[usuario.role]})
        </span>
      )}
      <span>Conectado desde: <b className="text-ink font-medium">{HORARIO_CONEXAO}</b></span>
      <span className="ml-auto">Sistema Oficina · JUCAX</span>
      <span>Versão {versao}</span>
    </div>
  )
}
