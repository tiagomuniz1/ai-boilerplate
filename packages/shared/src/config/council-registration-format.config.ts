import { CouncilType } from '../enums/council-type.enum'

export interface CouncilRegistrationFormat {
  numberPattern: RegExp
  numberMaxLength: number
  numberPlaceholder: string
  label: string
}

export const COUNCIL_REGISTRATION_FORMATS: Record<CouncilType, CouncilRegistrationFormat> = {
  [CouncilType.CRM]: {
    numberPattern: /^\d{1,6}$/,
    numberMaxLength: 6,
    numberPlaceholder: '12345',
    label: 'CRM',
  },
  [CouncilType.CRN]: {
    numberPattern: /^\d{1,8}$/,
    numberMaxLength: 8,
    numberPlaceholder: '12345678',
    label: 'CRN',
  },
  [CouncilType.CREFITO]: {
    numberPattern: /^\d{1,6}-?[FT]?$/,
    numberMaxLength: 8,
    numberPlaceholder: '123456-F',
    label: 'CREFITO',
  },
  [CouncilType.CRP]: {
    numberPattern: /^\d{2}\/\d{1,6}$/,
    numberMaxLength: 9,
    numberPlaceholder: '06/12345',
    label: 'CRP',
  },
  [CouncilType.CRO]: {
    numberPattern: /^\d{1,6}$/,
    numberMaxLength: 6,
    numberPlaceholder: '12345',
    label: 'CRO',
  },
  [CouncilType.CRFA]: {
    numberPattern: /^\d{1,2}-\d{1,5}$/,
    numberMaxLength: 8,
    numberPlaceholder: '2-12345',
    label: 'CRFA',
  },
}
