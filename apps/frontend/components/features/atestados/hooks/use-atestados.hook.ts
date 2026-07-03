import { useQuery } from '@tanstack/react-query'
import { listAtestadosUseCase } from '../use-cases/list-atestados.use-case'

export function useAtestados(appointmentId: string) {
  return useQuery({
    queryKey: ['atestados', appointmentId],
    queryFn: () => listAtestadosUseCase(appointmentId),
  })
}
