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
      // Same reasoning as the create hook: the response is the record, so write it
      // straight into the cache rather than making the screen wait on a refetch.
      queryClient.setQueryData(['medical-records', record.id], record)
      queryClient.setQueryData(['medical-records', 'by-appointment', record.appointmentId], record)

      queryClient.invalidateQueries({ queryKey: ['medical-records', 'patient', record.patientId] })
    },
  })
}
