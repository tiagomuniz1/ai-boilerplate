'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadClinicLogoUseCase } from '../use-cases/upload-clinic-logo.use-case'
import type { IClinicModel } from '../types/clinic.types'
import type { IApiError } from '@/types/api.types'

export function useUploadClinicLogo(clinicId?: string) {
  const queryClient = useQueryClient()

  return useMutation<IClinicModel, IApiError, File>({
    mutationFn: (file) => uploadClinicLogoUseCase(file, clinicId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clinicId ? ['clinics', clinicId] : ['clinics', 'me'],
      })
      queryClient.invalidateQueries({ queryKey: ['clinics', 'slug'] })
    },
  })
}
