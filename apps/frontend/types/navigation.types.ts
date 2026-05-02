import type { ReactNode } from 'react'
import type { UserRole } from '@app/shared'

export interface INavigationItem {
  id: string
  label: string
  href: string
  icon: ReactNode
  requiredRoles?: UserRole[]
}

export interface INavigationItemViewModel {
  id: string
  label: string
  href: string
  icon: ReactNode
  isActive: boolean
}
