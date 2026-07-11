import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { listWhatsappLog, type WhatsappLogEntry } from '@/lib/whatsappNfe'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { TIPO_TEMPLATE_LABELS } from '@/types/database'
import type { TipoTemplateWhatsapp } from '@/types/database'
import { formatDateTime } from '@/lib/format'
import { FiltroChip } from '@/components/ui/FiltroChip'

export default function MensagensWhatsapp() {
  const [logs, setLogs] = useState<WhatsappLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<TipoTemplateWhatsapp | 'todas'>('todas')

  useEffect(() => {
    listWhatsappLog(150).then((l) => {
      setLogs(l)
      setLoading(false)
    })
  }, [])

  const filtrados = filtro === 'todas' ? logs : logs.filter((l) => l.tipo === filtro)
  const tipos = [...new Set(logs.map((l) => l.tipo))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Mensagens WhatsApp</h1>
        <p className="text-ink-soft text-sm mt-1">Histórico de mensagens preparadas e enviadas pelo sistema</p>
      </div>

      {tipos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FiltroChip label="Todas" active={filtro === 'todas'} onClick={() => setFiltro('todas')} shrink />
          {tipos.map((t) => (
            <FiltroChip key={t} label={TIPO_TEMPLATE_LABELS[t]} active={filtro === t} onClick={() => setFiltro(t)} shrink />
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonList rows={6} />
      ) : (
        <div className="card divide-y divide-border">
          {filtrados.map((log) => (
            <div key={log.id} className="p-4 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-status-entregue shrink-0" />
                <span className="text-ink font-medium">{log.cliente?.nome || 'Cliente não vinculado'}</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-canvas text-ink-soft">
                  {TIPO_TEMPLATE_LABELS[log.tipo]}
                </span>
                <span className="text-xs text-ink-soft ml-auto shrink-0">{formatDateTime(log.created_at)}</span>
              </div>
              <p className="text-xs text-ink-soft font-mono">{log.telefone}</p>
              <p className="text-xs text-ink-soft line-clamp-2">{log.mensagem}</p>
            </div>
          ))}
          {filtrados.length === 0 && (
            <EmptyState icon={MessageCircle} title="Nenhuma mensagem registrada ainda" />
          )}
        </div>
      )}
    </div>
  )
}
