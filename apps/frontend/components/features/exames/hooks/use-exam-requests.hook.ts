import { useQuery } from '@tanstack/react-query'
import { listExamRequestsUseCase } from '../use-cases/list-exam-requests.use-case'

export function useExamRequests(appointmentId: string) {
  return useQuery({
    queryKey: ['exam-requests', appointmentId],
    queryFn: () => listExamRequestsUseCase(appointmentId),
  })
}
