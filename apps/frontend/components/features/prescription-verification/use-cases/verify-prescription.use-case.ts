import { prescriptionVerificationService } from '../services/prescription-verification.service'
import { toPrescriptionVerificationModel } from '../mappers/to-prescription-verification-model.mapper'
import type { IPrescriptionVerificationModel } from '../types/prescription-verification.types'

export async function verifyPrescriptionUseCase(
  token: string,
): Promise<IPrescriptionVerificationModel> {
  const dto = await prescriptionVerificationService.getByToken(token)
  return toPrescriptionVerificationModel(dto)
}
