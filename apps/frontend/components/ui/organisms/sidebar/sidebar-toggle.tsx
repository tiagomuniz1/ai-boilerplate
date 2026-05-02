'use client'

import { cn } from '@/lib/cn'

interface SidebarToggleProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function SidebarToggle({ isCollapsed, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      data-testid="sidebar-toggle"
      aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded',
        'text-text-dim hover:bg-surface-2 hover:text-text',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn('transition-transform duration-200', isCollapsed && 'rotate-180')}
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )
}
