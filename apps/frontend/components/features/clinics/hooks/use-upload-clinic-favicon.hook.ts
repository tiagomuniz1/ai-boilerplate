'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadClinicFaviconUseCase } from '../use-cases/upload-clinic-favicon.use-case'
import type { IClinicModel } from '../types/clinic.types'
import type { IApiError } from '@/types/api.types'

export function useUploadClinicFavicon(clinicId?: string) {
  const queryClient = useQueryClient()

  return useMutation<IClinicModel, IApiError, File>({
    mutationFn: (file) => uploadClinicFaviconUseCase(file, clinicId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clinicId ? ['clinics', clinicId] : ['clinics', 'me'],
      })
    },
  })
}
