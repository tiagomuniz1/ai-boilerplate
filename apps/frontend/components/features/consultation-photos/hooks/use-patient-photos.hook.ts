import { useQuery } from '@tanstack/react-query'
import { listPatientPhotosUseCase } from '../use-cases/list-patient-photos.use-case'

export function usePatientPhotos(patientId: string, page: number, limit: number) {
  return useQuery({
    queryKey: ['patient-photos', patientId, page, limit],
    queryFn: () => listPatientPhotosUseCase(patientId, page, limit),
  })
}
