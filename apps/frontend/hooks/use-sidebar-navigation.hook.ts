'use client'

import { usePathname } from 'next/navigation'
import { NAVIGATION_ITEMS } from '@/lib/constants'
import { useSidebarStore } from '@/stores/sidebar.store'
import type { INavigationItemViewModel } from '@/types/navigation.types'

interface UseSidebarNavigationReturn {
  items: INavigationItemViewModel[]
  isCollapsed: boolean
  toggle: () => void
}

export function useSidebarNavigation(): UseSidebarNavigationReturn {
  const pathname = usePathname()
  const { isCollapsed, toggle } = useSidebarStore()

  const items: INavigationItemViewModel[] = NAVIGATION_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    icon: item.icon,
    isActive: pathname === item.href || pathname.startsWith(item.href + '/'),
  }))

  return { items, isCollapsed, toggle }
}
