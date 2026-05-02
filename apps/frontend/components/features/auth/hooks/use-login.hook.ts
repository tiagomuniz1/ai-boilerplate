'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { loginUseCase } from '../use-cases/login.use-case'
import type { ILoginInput, IAuthUserModel } from '../types/auth.types'
import type { IApiError } from '@/types/api.types'

export function useLogin() {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation<IAuthUserModel, IApiError, ILoginInput>({
    mutationFn: loginUseCase,
    onSuccess: (user) => {
      setUser(user)
      router.push('/dashboard')
    },
  })
}
