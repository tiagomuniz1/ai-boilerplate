'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMedicationUseCase } from '../use-cases/update-medication.use-case'
import type { IMedicationModel } from '../types/medication-model.types'
import type { IUpdateMedicationInput } from '../types/medication-input.types'
import type { IApiError } from '@/types/api.types'

export function useUpdateMedication() {
  const queryClient = useQueryClient()

  return useMutation<IMedicationModel, IApiError, { id: string; data: IUpdateMedicationInput }>({
    mutationFn: ({ id, data }) => updateMedicationUseCase(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] })
      queryClient.invalidateQueries({ queryKey: ['medication', variables.id] })
    },
  })
}
