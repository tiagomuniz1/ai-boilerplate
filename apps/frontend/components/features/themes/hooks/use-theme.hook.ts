import { useQuery } from '@tanstack/react-query'
import { getThemeByIdUseCase } from '../use-cases/get-theme-by-id.use-case'

export function useTheme(id: string) {
  return useQuery({
    queryKey: ['theme', id],
    queryFn: () => getThemeByIdUseCase(id),
    enabled: !!id,
  })
}
