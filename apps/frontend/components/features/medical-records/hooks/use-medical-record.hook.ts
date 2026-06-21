'use client'

import { useQuery } from '@tanstack/react-query'
import { getMedicalRecordUseCase } from '../use-cases/get-medical-record.use-case'

export function useMedicalRecord(id: string) {
  return useQuery({
    queryKey: ['medical-records', id],
    queryFn: () => getMedicalRecordUseCase(id),
    enabled: !!id,
  })
}
