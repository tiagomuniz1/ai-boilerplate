import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recordVaccineDecisionUseCase } from '../use-cases/record-vaccine-decision.use-case'

export function useRecordVaccineDecision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordVaccineDecisionUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccine-status'] }),
  })
}
