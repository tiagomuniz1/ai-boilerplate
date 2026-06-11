import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createThemeUseCase } from '../use-cases/create-theme.use-case'

export function useCreateTheme() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: createThemeUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      router.push('/themes')
    },
  })
}
