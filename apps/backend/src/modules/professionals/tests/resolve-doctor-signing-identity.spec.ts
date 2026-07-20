import { UnprocessableEntityException } from '@nestjs/common'
import { resolveDoctorSigningIdentity } from '../utils/resolve-doctor-signing-identity'
import { Professional } from '../entities/professional.entity'

const APPOINTMENT_SPECIALTY_ID = 'specialty-appointment'
const OTHER_SPECIALTY_ID = 'specialty-other'
const PRIMARY_CRM_ID = 'crm-primary'
const SECONDARY_CRM_ID = 'crm-secondary'

function makeProfessional(overrides: Partial<Professional> = {}): Professional {
  return {
    registrations: [
      { id: PRIMARY_CRM_ID, number: '12345', state: 'SP', isPrimary: true },
      { id: SECONDARY_CRM_ID, number: '67890', state: 'RJ', isPrimary: false },
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

describe('resolveDoctorSigningIdentity', () => {
  it('defaults to the primary CRM and the appointment specialty (using its title)', () => {
    const result = resolveDoctorSigningIdentity(makeProfessional(), APPOINTMENT_SPECIALTY_ID)

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: '111', specialtyName: 'mastologista' })
  })

  it('falls back to the specialty name when the title is not set', () => {
    const result = resolveDoctorSigningIdentity(makeProfessional(), OTHER_SPECIALTY_ID)

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: '222', specialtyName: 'Cardiologia' })
  })

  it('returns null specialty/rqe when there is no appointment specialty and no override', () => {
    const result = resolveDoctorSigningIdentity(makeProfessional(), null)

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: null, specialtyName: null })
  })

  it('silently resolves to null when the appointment specialty is not registered for the professional', () => {
    const result = resolveDoctorSigningIdentity(makeProfessional(), 'unknown-specialty')

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: null, specialtyName: null })
  })

  it('uses the provided crmId when it belongs to the professional', () => {
    const result = resolveDoctorSigningIdentity(makeProfessional(), APPOINTMENT_SPECIALTY_ID, SECONDARY_CRM_ID)

    expect(result.crmNumber).toBe('67890/RJ')
  })

  it('throws when the provided crmId does not belong to the professional', () => {
    expect(() =>
      resolveDoctorSigningIdentity(makeProfessional(), APPOINTMENT_SPECIALTY_ID, 'unknown-crm'),
    ).toThrow(UnprocessableEntityException)
  })

  it('uses the provided specialtyId (carrying its RQE and title)', () => {
    const result = resolveDoctorSigningIdentity(
      makeProfessional(),
      APPOINTMENT_SPECIALTY_ID,
      undefined,
      OTHER_SPECIALTY_ID,
    )

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: '222', specialtyName: 'Cardiologia' })
  })

  it('throws when the provided specialtyId is not registered for the professional', () => {
    expect(() =>
      resolveDoctorSigningIdentity(makeProfessional(), APPOINTMENT_SPECIALTY_ID, undefined, 'unknown-specialty'),
    ).toThrow(UnprocessableEntityException)
  })

  it('returns an empty CRM number when the professional has no primary registration and none is chosen', () => {
    const professional = makeProfessional({
      registrations: [{ id: SECONDARY_CRM_ID, number: '67890', state: 'RJ', isPrimary: false }] as any,
    })

    const result = resolveDoctorSigningIdentity(professional, APPOINTMENT_SPECIALTY_ID)

    expect(result.crmNumber).toBe('')
  })
})
