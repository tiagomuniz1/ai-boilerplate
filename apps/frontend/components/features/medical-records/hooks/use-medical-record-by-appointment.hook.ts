'use client'

import { useQuery } from '@tanstack/react-query'
import { getMedicalRecordByAppointmentUseCase } from '../use-cases/get-medical-record-by-appointment.use-case'

export function useMedicalRecordByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ['medical-records', 'by-appointment', appointmentId],
    queryFn: () => getMedicalRecordByAppointmentUseCase(appointmentId),
    enabled: !!appointmentId,
  })
}
