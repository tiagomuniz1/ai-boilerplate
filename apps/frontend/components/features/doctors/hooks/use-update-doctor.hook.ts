'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { updateDoctorUseCase } from '../use-cases/update-doctor.use-case'
import type { IUpdateDoctorInput } from '../types/doctor-input.types'
import type { IDoctorModel } from '../types/doctor-model.types'
import type { IApiError } from '@/types/api.types'

export function useUpdateDoctor() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation<IDoctorModel, IApiError, { id: string; data: IUpdateDoctorInput }>({
    mutationFn: ({ id, data }) => updateDoctorUseCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors', id] })
      router.push(`/doctors/${id}`)
    },
  })
}
