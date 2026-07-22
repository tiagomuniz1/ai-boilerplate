import { CouncilType } from '@app/shared'
import { Professional } from '../entities/professional.entity'

// Falls back to CRM when no registration is flagged primary, mirroring the same fallback used
// by resolveProfessionalSigningIdentity for documents signing.
export function getPrimaryCouncilType(professional: Professional): CouncilType {
  return (
    professional.registrations.find((registration) => registration.isPrimary)?.councilType ??
    CouncilType.CRM
  )
}
