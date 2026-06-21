'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createTemplateUseCase } from '../use-cases/create-template.use-case'
import { useSlug } from '@/lib/slug-context'

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const slug = useSlug()

  return useMutation({
    mutationFn: createTemplateUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record-templates'] })
      router.push(`/${slug}/medical-record-templates`)
    },
  })
}
