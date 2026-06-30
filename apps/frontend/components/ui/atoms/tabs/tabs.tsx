'use client'

import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  'data-testid'?: string
}

export function Tabs({ items, activeId, onChange, 'data-testid': testId }: TabsProps) {
  return (
    <div
      role="tablist"
      data-testid={testId}
      className="inline-flex gap-1 rounded-full border border-line bg-surface p-1"
    >
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            data-testid={`tab-${item.id}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-accent-soft text-accent font-semibold'
                : 'text-text-mute hover:text-text',
            )}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span
                data-testid={`tab-count-${item.id}`}
                className="rounded-full bg-line px-1.5 py-0.5 text-xs text-text-dim leading-none"
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
