import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-graphite/50 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-surface rounded-xl shadow-popover border border-border p-5 animate-scale-in">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
              variant === 'danger' ? 'bg-red-50 text-status-cancelado' : 'bg-torque-light text-torque'
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-ink">{title}</h3>
            <p className="text-sm text-ink-soft mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
