'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadConsultationPhotosUseCase } from '../use-cases/upload-consultation-photos.use-case'

export function useUploadConsultationPhotos(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (files: File[]) => uploadConsultationPhotosUseCase(appointmentId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-photos', appointmentId] })
    },
  })
}
