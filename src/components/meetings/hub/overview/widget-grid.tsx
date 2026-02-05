interface WidgetGridProps {
  children: React.ReactNode
}

export function WidgetGrid({ children }: WidgetGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  )
}
