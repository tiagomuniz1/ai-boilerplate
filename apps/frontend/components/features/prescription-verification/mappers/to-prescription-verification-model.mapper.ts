import type { VerifyPrescriptionResponseDto } from '@app/shared'
import type { IPrescriptionVerificationModel } from '../types/prescription-verification.types'

export function toPrescriptionVerificationModel(
  dto: VerifyPrescriptionResponseDto,
): IPrescriptionVerificationModel {
  return {
    clinicName: dto.clinicName,
    professionalName: dto.professionalName,
    professionalCouncilType: dto.professionalCouncilType,
    professionalRegistrationNumber: dto.professionalRegistrationNumber,
    specialtyName: dto.specialtyName,
    patientNameMasked: dto.patientNameMasked,
    patientDocumentMasked: dto.patientDocumentMasked,
    issuedAt: new Date(dto.issuedAt),
    items: dto.items.map((item) => ({
      name: item.name,
      activeIngredient: item.activeIngredient,
      dosage: item.dosage,
      quantity: item.quantity,
    })),
  }
}
