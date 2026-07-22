import { ForbiddenException } from '@nestjs/common'
import { CouncilType } from '@app/shared'
import { Professional } from '../../professionals/entities/professional.entity'
import { getPrimaryCouncilType } from '../../professionals/utils/get-primary-council-type.util'

// specialtyId/councilType are never editable after creation (see CreateMedicalRecordTemplateUseCase),
// so updating/deactivating a template only needs to confirm the caller still owns its existing scope.
export function assertProfessionalOwnsTemplateScope(
  professional: Professional,
  specialtyId: string | null,
  councilType: CouncilType | null,
): void {
  if (specialtyId) {
    const ownsSpecialty = professional.professionalSpecialties.some(
      (professionalSpecialty) => professionalSpecialty.specialtyId === specialtyId,
    )
    if (!ownsSpecialty) {
      throw new ForbiddenException('You can only manage a template for your own specialty')
    }
    return
  }

  if (councilType !== getPrimaryCouncilType(professional)) {
    throw new ForbiddenException('You can only manage a template for your own profession')
  }
}
