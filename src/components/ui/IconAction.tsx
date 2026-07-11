interface IconActionProps {
  title: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}

export function IconAction({ title, onClick, children, danger = false }: IconActionProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        danger ? 'text-ink-soft hover:text-status-cancelado hover:bg-canvas' : 'text-ink-soft hover:text-torque hover:bg-canvas'
      }`}
    >
      {children}
    </button>
  )
}
