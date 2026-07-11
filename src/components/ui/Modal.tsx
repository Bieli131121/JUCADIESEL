import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, title, onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-graphite/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} bg-surface rounded-xl shadow-popover border border-border max-h-[90vh] overflow-y-auto animate-scale-in`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface rounded-t-xl">
          <h2 className="font-display font-semibold text-ink text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink hover:bg-canvas rounded-lg p-1 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
