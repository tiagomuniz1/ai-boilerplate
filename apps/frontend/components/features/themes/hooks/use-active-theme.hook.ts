import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getActiveThemeUseCase } from '../use-cases/get-active-theme.use-case'

export function useActiveTheme() {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['theme', 'active', user?.clinicId],
    queryFn: getActiveThemeUseCase,
    enabled: !!user?.clinicId,
    staleTime: 1000 * 60 * 5,
  })
}
