'use client'

import { useQuery } from '@tanstack/react-query'
import { listClinicSpecialtiesUseCase } from '../use-cases/list-clinic-specialties.use-case'
import type { IClinicSpecialtyListParams } from '../types/clinic-specialty.types'

export function useClinicSpecialties(clinicId: string, params?: IClinicSpecialtyListParams) {
  return useQuery({
    queryKey: ['clinic-specialties', clinicId, params],
    queryFn: () => listClinicSpecialtiesUseCase(clinicId, params),
    enabled: !!clinicId,
  })
}
