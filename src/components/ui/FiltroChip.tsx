interface FiltroChipProps {
  label: string
  active: boolean
  onClick: () => void
  shrink?: boolean
}

export function FiltroChip({ label, active, onClick, shrink = false }: FiltroChipProps) {
  return (
    <button
      onClick={onClick}
      className={`${shrink ? 'shrink-0 ' : ''}px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-graphite text-white border-graphite' : 'bg-white text-ink-soft border-border hover:border-ink-soft'
      }`}
    >
      {label}
    </button>
  )
}
