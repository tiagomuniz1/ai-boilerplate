'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createTemplateUseCase } from '../use-cases/create-template.use-case'
import { useBasePath } from '@/lib/slug-context'

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation({
    mutationFn: createTemplateUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record-templates'] })
      router.push(`${basePath}/medical-record-templates`)
    },
  })
}
