import { UnprocessableEntityException } from '@nestjs/common'
import { CouncilType } from '@app/shared'
import { Professional } from '../entities/professional.entity'
import { getPrimaryCouncilType } from './get-primary-council-type.util'

function makeProfessional(registrations: Array<{ councilType: CouncilType; isPrimary: boolean }>): Professional {
  return { registrations } as unknown as Professional
}

describe('getPrimaryCouncilType', () => {
  it('returns the council type of the primary registration', () => {
    const professional = makeProfessional([
      { councilType: CouncilType.CRN, isPrimary: false },
      { councilType: CouncilType.CRM, isPrimary: true },
    ])

    expect(getPrimaryCouncilType(professional)).toBe(CouncilType.CRM)
  })

  it('returns the council type of the primary registration for a non-CRM profession', () => {
    const professional = makeProfessional([{ councilType: CouncilType.CREFITO, isPrimary: true }])

    expect(getPrimaryCouncilType(professional)).toBe(CouncilType.CREFITO)
  })

  it('throws when no registration is flagged primary', () => {
    const professional = makeProfessional([{ councilType: CouncilType.CRN, isPrimary: false }])

    expect(() => getPrimaryCouncilType(professional)).toThrow(UnprocessableEntityException)
  })
})
