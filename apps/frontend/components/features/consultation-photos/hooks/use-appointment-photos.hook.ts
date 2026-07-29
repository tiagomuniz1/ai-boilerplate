import { useQuery } from '@tanstack/react-query'
import { listAppointmentPhotosUseCase } from '../use-cases/list-appointment-photos.use-case'

export function useAppointmentPhotos(appointmentId: string) {
  return useQuery({
    queryKey: ['appointment-photos', appointmentId],
    queryFn: () => listAppointmentPhotosUseCase(appointmentId),
  })
}
