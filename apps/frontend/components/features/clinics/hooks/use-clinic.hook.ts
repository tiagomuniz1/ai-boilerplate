import { useQuery } from '@tanstack/react-query'
import { getClinicUseCase } from '../use-cases/get-clinic.use-case'

export function useClinic(id: string) {
  return useQuery({
    queryKey: ['clinics', id],
    queryFn: () => getClinicUseCase(id),
  })
}
