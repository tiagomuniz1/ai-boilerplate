'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { linkSpecialtyUseCase } from '../use-cases/link-specialty.use-case'
import type { IClinicSpecialtyModel } from '../types/clinic-specialty.types'
import type { IApiError } from '@/types/api.types'

export function useLinkSpecialty(clinicId: string) {
  const queryClient = useQueryClient()

  return useMutation<IClinicSpecialtyModel, IApiError, string>({
    mutationFn: (specialtyId: string) => linkSpecialtyUseCase(clinicId, specialtyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-specialties', clinicId] })
    },
  })
}
