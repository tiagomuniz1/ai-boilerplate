import { UnprocessableEntityException } from '@nestjs/common'
import { CouncilType } from '@app/shared'
import { Professional } from '../entities/professional.entity'

// Every professional is required to have exactly one primary registration (enforced by
// CreateProfessionalUseCase/UpdateProfessionalUseCase), so a missing one signals corrupt data —
// silently defaulting to CRM would mislabel a CRN/CREFITO/etc. professional's own documents.
export function getPrimaryCouncilType(professional: Professional): CouncilType {
  const primaryRegistration = professional.registrations.find((registration) => registration.isPrimary)
  if (!primaryRegistration) {
    throw new UnprocessableEntityException('Professional has no primary registration')
  }
  return primaryRegistration.councilType
}
