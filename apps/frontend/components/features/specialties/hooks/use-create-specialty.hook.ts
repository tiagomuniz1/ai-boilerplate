'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createSpecialtyUseCase } from '../use-cases/create-specialty.use-case'
import type { ICreateSpecialtyInput } from '../types/specialty-input.types'
import type { ISpecialtyModel } from '../types/specialty-model.types'
import type { IApiError } from '@/types/api.types'

export function useCreateSpecialty() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<ISpecialtyModel, IApiError, ICreateSpecialtyInput>({
    mutationFn: createSpecialtyUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] })
      router.push(`${basePath}/specialties`)
    },
  })
}
