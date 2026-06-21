'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMedicalRecordUseCase } from '../use-cases/update-medical-record.use-case'
import type { IUpdateMedicalRecordInput } from '../types/medical-record-input.types'

export function useUpdateMedicalRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateMedicalRecordInput }) =>
      updateMedicalRecordUseCase(id, data),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', record.id] })
      queryClient.invalidateQueries({ queryKey: ['medical-records', 'by-appointment', record.appointmentId] })
      queryClient.invalidateQueries({ queryKey: ['medical-records', 'patient', record.patientId] })
    },
  })
}
