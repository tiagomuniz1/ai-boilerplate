import { useQuery } from '@tanstack/react-query'
import { listDoctorsUseCase } from '../use-cases/list-doctors.use-case'
import type { IDoctorListParams } from '../types/doctor-input.types'

export function useDoctors(params?: IDoctorListParams) {
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: () => listDoctorsUseCase(params),
  })
}
