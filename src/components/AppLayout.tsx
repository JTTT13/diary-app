import type { ReactNode } from "react"
import { BottomNav } from "./BottomNav"

interface AppLayoutProps {
  children: ReactNode
  currentView?: 'diary' | 'statistics' | 'editor' | 'settings'
  onViewChange?: (view: 'diary' | 'statistics' | 'editor' | 'settings') => void
  onAddClick?: () => void
}

export function AppLayout({ children, currentView = 'diary', onViewChange, onAddClick }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      <main className="pb-20 pt-safe min-h-screen overflow-y-auto">
        {children}
      </main>
      <BottomNav currentView={currentView} onViewChange={onViewChange} onAddClick={onAddClick} />
    </div>
  )
}
