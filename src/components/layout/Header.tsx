import { Menu } from 'lucide-react'

export function Header({ onOpenMenu, title }: { onOpenMenu: () => void; title: string }) {
  return (
    <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-surface border-b border-border sticky top-0 z-20">
      <button onClick={onOpenMenu} className="text-ink p-1">
        <Menu size={22} />
      </button>
      <span className="font-display font-semibold text-ink">{title}</span>
    </header>
  )
}
