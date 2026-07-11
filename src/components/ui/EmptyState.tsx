import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center text-ink-soft/60">
        <Icon size={22} />
      </div>
      <p className="text-ink font-medium text-sm">{title}</p>
      {description && <p className="text-ink-soft text-xs max-w-xs">{description}</p>}
    </div>
  )
}
