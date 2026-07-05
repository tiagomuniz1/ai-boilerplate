import { apiClient } from '@/lib/api-client'
import type { VerifyPrescriptionResponseDto } from '@app/shared'

export const prescriptionVerificationService = {
  getByToken: (token: string) =>
    apiClient.get<VerifyPrescriptionResponseDto>(`/prescriptions/verify/${token}`),
}
