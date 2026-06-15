'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useSlug } from '@/lib/slug-context'
import { createPatientUseCase } from '../use-cases/create-patient.use-case'
import type { ICreatePatientInput } from '../types/patient-input.types'
import type { IPatientModel } from '../types/patient-model.types'
import type { IApiError } from '@/types/api.types'

export function useCreatePatient() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const slug = useSlug()

  return useMutation<IPatientModel, IApiError, ICreatePatientInput>({
    mutationFn: createPatientUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push(`/${slug}/patients`)
    },
  })
}
