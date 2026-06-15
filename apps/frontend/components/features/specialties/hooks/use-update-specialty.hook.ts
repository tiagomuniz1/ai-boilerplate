'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useSlug } from '@/lib/slug-context'
import { updateSpecialtyUseCase } from '../use-cases/update-specialty.use-case'
import type { IUpdateSpecialtyInput } from '../types/specialty-input.types'
import type { ISpecialtyModel } from '../types/specialty-model.types'
import type { IApiError } from '@/types/api.types'

export function useUpdateSpecialty() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const slug = useSlug()

  return useMutation<ISpecialtyModel, IApiError, { id: string; data: IUpdateSpecialtyInput }>({
    mutationFn: ({ id, data }) => updateSpecialtyUseCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] })
      queryClient.invalidateQueries({ queryKey: ['specialties', id] })
      router.push(`/${slug}/specialties/${id}`)
    },
  })
}
