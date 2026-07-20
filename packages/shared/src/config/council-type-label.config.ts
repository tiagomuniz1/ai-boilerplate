import { CouncilType } from '../enums/council-type.enum'

export const COUNCIL_TYPE_LABELS: Record<CouncilType, string> = {
  [CouncilType.CRM]: 'CRM',
  [CouncilType.CRN]: 'CRN',
  [CouncilType.CREFITO]: 'CREFITO',
  [CouncilType.CRP]: 'CRP',
  [CouncilType.CRO]: 'CRO',
  [CouncilType.COREN]: 'COREN',
  [CouncilType.CREF]: 'CREF',
  [CouncilType.CRFA]: 'CRFA',
}
