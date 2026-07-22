import { CouncilType } from '../enums/council-type.enum'

export interface RegistrationWithCouncilType {
  councilType: CouncilType
  isPrimary: boolean
}

// Falls back to CRM when no registration is flagged primary — should not normally happen, since
// exactly one registration is always primary, but keeps callers from having to handle `undefined`.
export function getPrimaryCouncilType(registrations: RegistrationWithCouncilType[]): CouncilType {
  return registrations.find((registration) => registration.isPrimary)?.councilType ?? CouncilType.CRM
}
