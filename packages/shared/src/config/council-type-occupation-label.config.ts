import { CouncilType } from '../enums/council-type.enum'

export const COUNCIL_TYPE_OCCUPATION_LABELS: Record<CouncilType, string> = {
  [CouncilType.CRM]: 'Médico',
  [CouncilType.CRN]: 'Nutricionista',
  [CouncilType.CREFITO]: 'Fisioterapeuta',
  [CouncilType.CRP]: 'Psicólogo',
  [CouncilType.CRO]: 'Dentista',
  [CouncilType.CRFA]: 'Fonoaudiólogo',
}
