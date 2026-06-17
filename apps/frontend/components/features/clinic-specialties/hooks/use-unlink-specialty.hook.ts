'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { unlinkSpecialtyUseCase } from '../use-cases/unlink-specialty.use-case'
import type { IApiError } from '@/types/api.types'

export function useUnlinkSpecialty(clinicId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (specialtyId: string) => unlinkSpecialtyUseCase(clinicId, specialtyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-specialties', clinicId] })
    },
  })
}
