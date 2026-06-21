'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { deleteTemplateUseCase } from '../use-cases/delete-template.use-case'
import { useSlug } from '@/lib/slug-context'

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const slug = useSlug()

  return useMutation({
    mutationFn: deleteTemplateUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record-templates'] })
      router.push(`/${slug}/medical-record-templates`)
    },
  })
}
