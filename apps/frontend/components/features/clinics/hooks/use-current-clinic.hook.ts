import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getCurrentClinicUseCase } from '../use-cases/get-current-clinic.use-case'

export function useCurrentClinic() {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['clinics', 'me'],
    queryFn: getCurrentClinicUseCase,
    enabled: !!user?.clinicId,
    staleTime: 1000 * 60 * 5,
  })
}
