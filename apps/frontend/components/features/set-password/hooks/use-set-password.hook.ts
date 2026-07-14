'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { setPasswordUseCase } from '../use-cases/set-password.use-case'
import type { SetPasswordDto } from '@app/shared'
import type { IApiError } from '@/types/api.types'

export function useSetPassword() {
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<void, IApiError, SetPasswordDto>({
    mutationFn: setPasswordUseCase,
    onSuccess: () => {
      router.push(`${basePath}/login?passwordSet=true`)
    },
  })
}
