'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useSlug } from '@/lib/slug-context'
import { createMedicationUseCase } from '../use-cases/create-medication.use-case'
import type { IMedicationModel } from '../types/medication-model.types'
import type { ICreateMedicationInput } from '../types/medication-input.types'
import type { IApiError } from '@/types/api.types'

export function useCreateMedication() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const slug = useSlug()

  return useMutation<IMedicationModel, IApiError, ICreateMedicationInput>({
    mutationFn: createMedicationUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] })
      router.push(`/${slug}/medications`)
    },
  })
}
