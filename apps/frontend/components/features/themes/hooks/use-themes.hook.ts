import { useQuery } from '@tanstack/react-query'
import { getThemesUseCase } from '../use-cases/get-themes.use-case'

export function useThemes(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['themes', page, limit],
    queryFn: () => getThemesUseCase(page, limit),
  })
}
