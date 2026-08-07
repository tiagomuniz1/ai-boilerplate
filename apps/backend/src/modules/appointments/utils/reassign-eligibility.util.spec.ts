import { CouncilType } from '@app/shared'
import { Professional } from '../../professionals/entities/professional.entity'
import { isEligibleReassignTarget } from './reassign-eligibility.util'

const SPECIALTY_A = 'specialty-a'
const SPECIALTY_B = 'specialty-b'

const makeProfessional = (
  id: string,
  specialtyIds: string[],
  councilType: CouncilType = CouncilType.CRM,
  hasPrimary = true,
): Professional =>
  ({
    id,
    registrations: [{ councilType, isPrimary: hasPrimary }],
    professionalSpecialties: specialtyIds.map((specialtyId) => ({ specialtyId })),
  }) as Professional

describe('isEligibleReassignTarget', () => {
  const original = makeProfessional('original', [SPECIALTY_A])

  it('excludes the current professional', () => {
    expect(isEligibleReassignTarget(makeProfessional('original', [SPECIALTY_A]), original, SPECIALTY_A)).toBe(false)
  })

  describe('specialty appointment', () => {
    it('is eligible when the target holds the appointment specialty', () => {
      const target = makeProfessional('t', [SPECIALTY_A, SPECIALTY_B])
      expect(isEligibleReassignTarget(target, original, SPECIALTY_A)).toBe(true)
    })

    it('is not eligible when the target does not hold the appointment specialty', () => {
      const target = makeProfessional('t', [SPECIALTY_B])
      expect(isEligibleReassignTarget(target, original, SPECIALTY_A)).toBe(false)
    })
  })

  describe('generalist appointment (null specialty)', () => {
    it('is eligible when the primary council matches the original professional', () => {
      const originalGeneralist = makeProfessional('original', [], CouncilType.CRN)
      const target = makeProfessional('t', [], CouncilType.CRN)
      expect(isEligibleReassignTarget(target, originalGeneralist, null)).toBe(true)
    })

    it('is not eligible when the primary council differs', () => {
      const originalGeneralist = makeProfessional('original', [], CouncilType.CRN)
      const target = makeProfessional('t', [], CouncilType.CREFITO)
      expect(isEligibleReassignTarget(target, originalGeneralist, null)).toBe(false)
    })
  })
})
