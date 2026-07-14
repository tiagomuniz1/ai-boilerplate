import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { updateThemeUseCase } from '../use-cases/update-theme.use-case'
import type { IUpdateThemeInput } from '../types/theme-input.types'

export function useUpdateTheme(id: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation({
    mutationFn: (data: IUpdateThemeInput) => updateThemeUseCase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      queryClient.invalidateQueries({ queryKey: ['theme', id] })
      queryClient.invalidateQueries({ queryKey: ['theme', 'active'] })
      router.push(`${basePath}/themes`)
    },
  })
}
