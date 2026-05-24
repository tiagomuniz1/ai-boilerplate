'use client'

import { usePathname } from 'next/navigation'
import { NAVIGATION_ITEMS } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
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
  const role = useAuthStore((state) => state.user?.role)

  const items: INavigationItemViewModel[] = NAVIGATION_ITEMS
    .filter((item) => !item.requiredRoles || (role && item.requiredRoles.includes(role)))
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon,
      isActive: pathname === item.href || pathname.startsWith(item.href + '/'),
    }))

  return { items, isCollapsed, toggle }
}
