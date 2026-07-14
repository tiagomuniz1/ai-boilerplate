'use client'

import { usePathname } from 'next/navigation'
import { NAVIGATION_ITEMS } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import { useBasePath } from '@/lib/slug-context'
import type { INavigationItemViewModel } from '@/types/navigation.types'

interface UseSidebarNavigationReturn {
  items: INavigationItemViewModel[]
}

export function useSidebarNavigation(): UseSidebarNavigationReturn {
  const pathname = usePathname()
  const role = useAuthStore((state) => state.user?.role)
  const basePath = useBasePath()

  const items: INavigationItemViewModel[] = NAVIGATION_ITEMS
    .filter((item) => !item.requiredRoles || (role && item.requiredRoles.includes(role)))
    .map((item) => {
      const href = `${basePath}${item.href}`
      return {
        id: item.id,
        label: item.label,
        href,
        icon: item.icon,
        isActive: pathname === href || pathname.startsWith(href + '/'),
      }
    })

  return { items }
}
