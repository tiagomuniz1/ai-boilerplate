'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createPatientUseCase } from '../use-cases/create-patient.use-case'
import type { ICreatePatientInput } from '../types/patient-input.types'
import type { IPatientModel } from '../types/patient-model.types'
import type { IApiError } from '@/types/api.types'

export function useCreatePatient() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation<IPatientModel, IApiError, ICreatePatientInput>({
    mutationFn: createPatientUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push('/patients')
    },
  })
}
