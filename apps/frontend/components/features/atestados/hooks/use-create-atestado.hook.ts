'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAtestadoUseCase } from '../use-cases/create-atestado.use-case'

export function useCreateAtestado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAtestadoUseCase,
    onSuccess: (atestado) => {
      queryClient.invalidateQueries({ queryKey: ['atestados', atestado.appointmentId] })
    },
  })
}
