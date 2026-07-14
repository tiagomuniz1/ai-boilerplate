'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createDoctorUseCase } from '../use-cases/create-doctor.use-case'
import type { ICreateDoctorInput } from '../types/doctor-input.types'
import type { IDoctorModel } from '../types/doctor-model.types'
import type { IApiError } from '@/types/api.types'

export function useCreateDoctor() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IDoctorModel, IApiError, ICreateDoctorInput>({
    mutationFn: createDoctorUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push(`${basePath}/doctors`)
    },
  })
}
