'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { updateClinicUseCase } from '../use-cases/update-clinic.use-case'
import type { IUpdateClinicInput, IClinicModel } from '../types/clinic.types'
import type { IApiError } from '@/types/api.types'

export function useUpdateClinic() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation<IClinicModel, IApiError, { id: string; data: IUpdateClinicInput }>({
    mutationFn: ({ id, data }) => updateClinicUseCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] })
      queryClient.invalidateQueries({ queryKey: ['clinics', id] })
      router.push(`/clinics/${id}`)
    },
  })
}
