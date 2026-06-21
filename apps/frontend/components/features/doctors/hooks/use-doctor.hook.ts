import { useQuery } from '@tanstack/react-query'
import { getDoctorUseCase } from '../use-cases/get-doctor.use-case'

export function useDoctor(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['doctors', id],
    queryFn: () => getDoctorUseCase(id),
    enabled: options?.enabled ?? true,
  })
}
