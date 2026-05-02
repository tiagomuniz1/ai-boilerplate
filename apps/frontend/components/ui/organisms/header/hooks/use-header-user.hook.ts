'use client'

import { useAuthStore } from '@/stores/auth.store'
import type { IHeaderUserModel } from '../types/header.types'

export interface IUseHeaderUserResult {
  user: IHeaderUserModel | null
  isAuthenticated: boolean
}

export function useHeaderUser(): IUseHeaderUserResult {
  const storeUser = useAuthStore((state) => state.user)

  if (!storeUser) {
    return { user: null, isAuthenticated: false }
  }

  const user: IHeaderUserModel = {
    id: storeUser.id,
    fullName: storeUser.fullName,
    email: storeUser.email,
  }

  return { user, isAuthenticated: true }
}
