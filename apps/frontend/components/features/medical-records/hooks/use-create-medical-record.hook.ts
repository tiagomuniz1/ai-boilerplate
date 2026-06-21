'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMedicalRecordUseCase } from '../use-cases/create-medical-record.use-case'

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMedicalRecordUseCase,
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', 'by-appointment', record.appointmentId] })
      queryClient.invalidateQueries({ queryKey: ['medical-records', 'patient', record.patientId] })
    },
  })
}
