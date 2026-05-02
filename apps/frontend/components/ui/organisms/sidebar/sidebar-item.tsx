'use client'

import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { INavigationItemViewModel } from '@/types/navigation.types'

interface SidebarItemProps {
  item: INavigationItemViewModel
  isCollapsed: boolean
}

export function SidebarItem({ item, isCollapsed }: SidebarItemProps) {
  return (
    <Link
      href={item.href}
      data-testid={`sidebar-item-${item.id}`}
      aria-current={item.isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-[11px] w-full rounded',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        item.isActive
          ? 'bg-accent-soft text-text'
          : 'text-text-dim hover:bg-surface-2 hover:text-text',
      )}
      style={{ padding: '9px 10px', fontSize: '13.5px' }}
    >
      <span
        className={cn('shrink-0', item.isActive && 'text-accent')}
        aria-hidden="true"
      >
        {item.icon}
      </span>
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  )
}
