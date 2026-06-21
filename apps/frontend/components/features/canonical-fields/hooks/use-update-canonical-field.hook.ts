'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCanonicalFieldUseCase } from '../use-cases/update-canonical-field.use-case'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'
import type { IUpdateCanonicalFieldInput } from '../types/canonical-field-input.types'
import type { IApiError } from '@/types/api.types'

export function useUpdateCanonicalField() {
  const queryClient = useQueryClient()

  return useMutation<ICanonicalFieldModel, IApiError, { id: string; data: IUpdateCanonicalFieldInput }>({
    mutationFn: ({ id, data }) => updateCanonicalFieldUseCase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canonical-fields'] })
    },
  })
}
