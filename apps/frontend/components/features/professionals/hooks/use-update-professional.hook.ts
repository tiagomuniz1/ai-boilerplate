'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { updateProfessionalUseCase } from '../use-cases/update-professional.use-case'
import type { IUpdateProfessionalInput } from '../types/professional-input.types'
import type { IProfessionalModel } from '../types/professional-model.types'
import type { IApiError } from '@/types/api.types'

export function useUpdateProfessional() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IProfessionalModel, IApiError, { id: string; data: IUpdateProfessionalInput }>({
    mutationFn: ({ id, data }) => updateProfessionalUseCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['professionals', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push(`${basePath}/professionals/${id}`)
    },
  })
}
