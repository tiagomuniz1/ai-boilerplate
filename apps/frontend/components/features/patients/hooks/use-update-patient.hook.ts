'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { updatePatientUseCase } from '../use-cases/update-patient.use-case'
import type { IUpdatePatientInput } from '../types/patient-input.types'
import type { IPatientModel } from '../types/patient-model.types'
import type { IApiError } from '@/types/api.types'

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation<IPatientModel, IApiError, { id: string; data: IUpdatePatientInput }>({
    mutationFn: ({ id, data }) => updatePatientUseCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patients', id] })
      router.push(`/patients/${id}`)
    },
  })
}
