'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAtestadoUseCase } from '../use-cases/delete-atestado.use-case'

export function useDeleteAtestado(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteAtestadoUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atestados', appointmentId] })
    },
  })
}
