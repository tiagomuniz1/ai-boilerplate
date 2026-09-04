import { useQuery } from '@tanstack/react-query'
import { getPatientVaccineStatusUseCase } from '../use-cases/get-patient-vaccine-status.use-case'

export function usePatientVaccineStatus(patientId: string) {
  return useQuery({
    queryKey: ['vaccine-status', patientId],
    queryFn: () => getPatientVaccineStatusUseCase(patientId),
    enabled: !!patientId,
  })
}
