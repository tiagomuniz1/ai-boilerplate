'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteConsultationPhotoUseCase } from '../use-cases/delete-consultation-photo.use-case'

export function useDeleteConsultationPhoto(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteConsultationPhotoUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-photos', appointmentId] })
    },
  })
}
