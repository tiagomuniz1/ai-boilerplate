'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMedicalRecordUseCase } from '../use-cases/create-medical-record.use-case'

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMedicalRecordUseCase,
    onSuccess: (record) => {
      // Seed the cache with the record the API just returned instead of only
      // invalidating. Waiting for the refetch leaves a window where the section
      // still renders "Prontuário ainda não preenchido" over a record that was
      // saved — and if that refetch fails, the window never closes and the
      // professional fills the form again. The POST response is already the
      // authoritative representation, so there is nothing to re-ask for.
      queryClient.setQueryData(['medical-records', 'by-appointment', record.appointmentId], record)
      queryClient.setQueryData(['medical-records', record.id], record)

      // The patient history is a list this response cannot reconstruct.
      queryClient.invalidateQueries({ queryKey: ['medical-records', 'patient', record.patientId] })
    },
  })
}
