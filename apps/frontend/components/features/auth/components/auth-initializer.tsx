'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'
import { toAuthUserModel } from '../mappers/to-auth-user-model'

export function AuthInitializer() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    if (user) return
    authService
      .getMe()
      .then((dto) => setUser(toAuthUserModel(dto)))
      .catch(() => {
        // apiClient 401 interceptor handles redirect to /login
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
