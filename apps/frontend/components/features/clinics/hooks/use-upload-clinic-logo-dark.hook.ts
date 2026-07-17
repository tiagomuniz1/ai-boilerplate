'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadClinicLogoDarkUseCase } from '../use-cases/upload-clinic-logo-dark.use-case'
import type { IClinicModel } from '../types/clinic.types'
import type { IApiError } from '@/types/api.types'

export function useUploadClinicLogoDark(clinicId?: string) {
  const queryClient = useQueryClient()

  return useMutation<IClinicModel, IApiError, File>({
    mutationFn: (file) => uploadClinicLogoDarkUseCase(file, clinicId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clinicId ? ['clinics', clinicId] : ['clinics', 'me'],
      })
      queryClient.invalidateQueries({ queryKey: ['clinics', 'slug'] })
    },
  })
}
