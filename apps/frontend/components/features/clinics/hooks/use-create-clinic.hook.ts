'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createClinicUseCase } from '../use-cases/create-clinic.use-case'
import type { ICreateClinicInput, IClinicModel } from '../types/clinic.types'
import type { IApiError } from '@/types/api.types'

export function useCreateClinic() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IClinicModel, IApiError, ICreateClinicInput>({
    mutationFn: createClinicUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] })
      router.push(`${basePath}/clinics`)
    },
  })
}
