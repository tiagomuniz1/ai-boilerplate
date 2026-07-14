'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createCanonicalFieldUseCase } from '../use-cases/create-canonical-field.use-case'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'
import type { ICreateCanonicalFieldInput } from '../types/canonical-field-input.types'
import type { IApiError } from '@/types/api.types'

export function useCreateCanonicalField() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<ICanonicalFieldModel, IApiError, ICreateCanonicalFieldInput>({
    mutationFn: createCanonicalFieldUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canonical-fields'] })
      router.push(`${basePath}/canonical-fields`)
    },
  })
}
