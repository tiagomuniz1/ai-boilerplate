'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { useSlug, useBasePath } from '@/lib/slug-context'
import { loginUseCase } from '../use-cases/login.use-case'
import type { ILoginInput, IAuthUserModel } from '../types/auth.types'
import type { IApiError } from '@/types/api.types'

export function useLogin() {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)
  const slug = useSlug()
  const basePath = useBasePath()

  return useMutation<IAuthUserModel, IApiError, ILoginInput>({
    mutationFn: (input) => loginUseCase({ ...input, slug }),
    onSuccess: (user) => {
      setUser(user)
      const home = user.role === UserRole.PLATFORM_ADMIN
        ? `${basePath}/clinics`
        : `${basePath}/dashboard`
      router.push(home)
    },
  })
}
