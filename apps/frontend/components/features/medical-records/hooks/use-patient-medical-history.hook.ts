'use client'

import { useQuery } from '@tanstack/react-query'
import { listPatientMedicalHistoryUseCase } from '../use-cases/list-patient-medical-history.use-case'
import type { IPatientHistoryParams } from '../services/medical-records.service'

export function usePatientMedicalHistory(patientId: string, params?: IPatientHistoryParams) {
  return useQuery({
    queryKey: ['medical-records', 'patient', patientId, params],
    queryFn: () => listPatientMedicalHistoryUseCase(patientId, params),
    enabled: !!patientId,
  })
}
