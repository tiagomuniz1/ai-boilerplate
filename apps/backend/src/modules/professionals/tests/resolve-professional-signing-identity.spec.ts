import { UnprocessableEntityException } from '@nestjs/common'
import { CouncilType } from '@app/shared'
import { resolveProfessionalSigningIdentity } from '../utils/resolve-professional-signing-identity'
import { Professional } from '../entities/professional.entity'

const APPOINTMENT_SPECIALTY_ID = 'specialty-appointment'
const OTHER_SPECIALTY_ID = 'specialty-other'
const PRIMARY_CRM_ID = 'crm-primary'
const SECONDARY_CRM_ID = 'crm-secondary'

function makeProfessional(overrides: Partial<Professional> = {}): Professional {
  return {
    registrations: [
      { id: PRIMARY_CRM_ID, number: '12345', state: 'SP', councilType: CouncilType.CRM, isPrimary: true },
      { id: SECONDARY_CRM_ID, number: '67890', state: 'RJ', councilType: CouncilType.CRM, isPrimary: false },
    ],
    professionalSpecialties: [
      {
        specialtyId: APPOINTMENT_SPECIALTY_ID,
        registryNumber: '111',
        specialty: { name: 'Mastologia', titleName: 'mastologista' },
      },
      {
        specialtyId: OTHER_SPECIALTY_ID,
        registryNumber: '222',
        specialty: { name: 'Cardiologia', titleName: null },
      },
    ],
    ...overrides,
  } as unknown as Professional
}

describe('resolveProfessionalSigningIdentity', () => {
  it('defaults to the primary registration and the appointment specialty (using its title)', () => {
    const result = resolveProfessionalSigningIdentity(makeProfessional(), APPOINTMENT_SPECIALTY_ID)

    expect(result).toEqual({
      councilType: CouncilType.CRM,
      registrationNumber: '12345/SP',
      registryNumber: '111',
      specialtyName: 'mastologista',
    })
  })

  it('falls back to the specialty name when the title is not set', () => {
    const result = resolveProfessionalSigningIdentity(makeProfessional(), OTHER_SPECIALTY_ID)

    expect(result).toEqual({
      councilType: CouncilType.CRM,
      registrationNumber: '12345/SP',
      registryNumber: '222',
      specialtyName: 'Cardiologia',
    })
  })

  it('returns null specialty/registry number when there is no appointment specialty and no override', () => {
    const result = resolveProfessionalSigningIdentity(makeProfessional(), null)

    expect(result).toEqual({
      councilType: CouncilType.CRM,
      registrationNumber: '12345/SP',
      registryNumber: null,
      specialtyName: null,
    })
  })

  it('silently resolves to null when the appointment specialty is not registered for the professional', () => {
    const result = resolveProfessionalSigningIdentity(makeProfessional(), 'unknown-specialty')

    expect(result).toEqual({
      councilType: CouncilType.CRM,
      registrationNumber: '12345/SP',
      registryNumber: null,
      specialtyName: null,
    })
  })

  it('uses the provided registrationId when it belongs to the professional', () => {
    const result = resolveProfessionalSigningIdentity(makeProfessional(), APPOINTMENT_SPECIALTY_ID, SECONDARY_CRM_ID)

    expect(result.registrationNumber).toBe('67890/RJ')
  })

  it('throws when the provided registrationId does not belong to the professional', () => {
    expect(() =>
      resolveProfessionalSigningIdentity(makeProfessional(), APPOINTMENT_SPECIALTY_ID, 'unknown-crm'),
    ).toThrow(UnprocessableEntityException)
  })

  it('uses the provided specialtyId (carrying its registry number and title)', () => {
    const result = resolveProfessionalSigningIdentity(
      makeProfessional(),
      APPOINTMENT_SPECIALTY_ID,
      undefined,
      OTHER_SPECIALTY_ID,
    )

    expect(result).toEqual({
      councilType: CouncilType.CRM,
      registrationNumber: '12345/SP',
      registryNumber: '222',
      specialtyName: 'Cardiologia',
    })
  })

  it('throws when the provided specialtyId is not registered for the professional', () => {
    expect(() =>
      resolveProfessionalSigningIdentity(makeProfessional(), APPOINTMENT_SPECIALTY_ID, undefined, 'unknown-specialty'),
    ).toThrow(UnprocessableEntityException)
  })

  it('throws when the professional has no primary registration and none is chosen', () => {
    const professional = makeProfessional({
      registrations: [
        { id: SECONDARY_CRM_ID, number: '67890', state: 'RJ', councilType: CouncilType.CRM, isPrimary: false },
      ] as any,
    })

    expect(() => resolveProfessionalSigningIdentity(professional, APPOINTMENT_SPECIALTY_ID)).toThrow(
      UnprocessableEntityException,
    )
  })

  it('resolves a non-CRM council type from the primary registration', () => {
    const professional = makeProfessional({
      registrations: [
        { id: PRIMARY_CRM_ID, number: '9876543', state: 'SP', councilType: CouncilType.CRN, isPrimary: true },
      ] as any,
    })

    const result = resolveProfessionalSigningIdentity(professional, null)

    expect(result.councilType).toBe(CouncilType.CRN)
    expect(result.registrationNumber).toBe('9876543/SP')
  })

  it('resolves a generalist non-CRM professional (no specialties) with null specialty/registry data', () => {
    const professional = {
      registrations: [
        { id: PRIMARY_CRM_ID, number: '9876543', state: 'SP', councilType: CouncilType.CREFITO, isPrimary: true },
      ],
      professionalSpecialties: [],
    } as unknown as Professional

    const result = resolveProfessionalSigningIdentity(professional, null)

    expect(result).toEqual({
      councilType: CouncilType.CREFITO,
      registrationNumber: '9876543/SP',
      registryNumber: null,
      specialtyName: null,
    })
  })
})
