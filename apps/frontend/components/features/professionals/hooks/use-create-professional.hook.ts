'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createProfessionalUseCase } from '../use-cases/create-professional.use-case'
import type { ICreateProfessionalInput } from '../types/professional-input.types'
import type { IProfessionalModel } from '../types/professional-model.types'
import type { IApiError } from '@/types/api.types'

export function useCreateProfessional() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IProfessionalModel, IApiError, ICreateProfessionalInput>({
    mutationFn: createProfessionalUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push(`${basePath}/professionals`)
    },
  })
}
