'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'
import { toAuthUserModel } from '../mappers/to-auth-user-model'

export function AuthInitializer() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    // Skip only when we have a fully hydrated user (role + clinicId explicitly present).
    // If clinicId is undefined, the persisted data predates the clinicId field —
    // call /auth/me to get fresh data with the correct clinicId.
    if (user?.role && user.clinicId !== undefined) return
    authService
      .getMe()
      .then((dto) => setUser(toAuthUserModel(dto)))
      .catch(() => {
        // apiClient 401 interceptor handles redirect to /login
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
