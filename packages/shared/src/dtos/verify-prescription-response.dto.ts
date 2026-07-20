import { CouncilType } from '../enums/council-type.enum'

export class VerifyPrescriptionItemDto {
  name!: string
  activeIngredient!: string | null
  dosage!: string | null
  quantity!: string | null
}

export class VerifyPrescriptionResponseDto {
  clinicName!: string
  professionalName!: string
  professionalCouncilType!: CouncilType
  professionalRegistrationNumber!: string
  specialtyName!: string | null
  patientNameMasked!: string
  patientDocumentMasked!: string
  issuedAt!: string
  items!: VerifyPrescriptionItemDto[]
}
