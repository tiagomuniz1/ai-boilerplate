import { CouncilType } from '../enums/council-type.enum'

export const COUNCIL_TYPE_PROFESSION_LABELS: Record<CouncilType, string> = {
  [CouncilType.CRM]: 'Medicina',
  [CouncilType.CRN]: 'Nutrição',
  [CouncilType.CREFITO]: 'Fisioterapia',
  [CouncilType.CRP]: 'Psicologia',
  [CouncilType.CRO]: 'Odontologia',
  [CouncilType.CRFA]: 'Fonoaudiologia',
}
