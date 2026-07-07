import { UnprocessableEntityException } from '@nestjs/common'
import { resolveDoctorSigningIdentity } from '../utils/resolve-doctor-signing-identity'
import { Doctor } from '../entities/doctor.entity'

const APPOINTMENT_SPECIALTY_ID = 'specialty-appointment'
const OTHER_SPECIALTY_ID = 'specialty-other'
const PRIMARY_CRM_ID = 'crm-primary'
const SECONDARY_CRM_ID = 'crm-secondary'

function makeDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    crms: [
      { id: PRIMARY_CRM_ID, number: '12345', state: 'SP', isPrimary: true },
      { id: SECONDARY_CRM_ID, number: '67890', state: 'RJ', isPrimary: false },
    ],
    doctorSpecialties: [
      {
        specialtyId: APPOINTMENT_SPECIALTY_ID,
        rqe: '111',
        specialty: { name: 'Mastologia', titleName: 'mastologista' },
      },
      {
        specialtyId: OTHER_SPECIALTY_ID,
        rqe: '222',
        specialty: { name: 'Cardiologia', titleName: null },
      },
    ],
    ...overrides,
  } as unknown as Doctor
}

describe('resolveDoctorSigningIdentity', () => {
  it('defaults to the primary CRM and the appointment specialty (using its title)', () => {
    const result = resolveDoctorSigningIdentity(makeDoctor(), APPOINTMENT_SPECIALTY_ID)

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: '111', specialtyName: 'mastologista' })
  })

  it('falls back to the specialty name when the title is not set', () => {
    const result = resolveDoctorSigningIdentity(makeDoctor(), OTHER_SPECIALTY_ID)

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: '222', specialtyName: 'Cardiologia' })
  })

  it('returns null specialty/rqe when there is no appointment specialty and no override', () => {
    const result = resolveDoctorSigningIdentity(makeDoctor(), null)

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: null, specialtyName: null })
  })

  it('silently resolves to null when the appointment specialty is not registered for the doctor', () => {
    const result = resolveDoctorSigningIdentity(makeDoctor(), 'unknown-specialty')

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: null, specialtyName: null })
  })

  it('uses the provided crmId when it belongs to the doctor', () => {
    const result = resolveDoctorSigningIdentity(makeDoctor(), APPOINTMENT_SPECIALTY_ID, SECONDARY_CRM_ID)

    expect(result.crmNumber).toBe('67890/RJ')
  })

  it('throws when the provided crmId does not belong to the doctor', () => {
    expect(() =>
      resolveDoctorSigningIdentity(makeDoctor(), APPOINTMENT_SPECIALTY_ID, 'unknown-crm'),
    ).toThrow(UnprocessableEntityException)
  })

  it('uses the provided specialtyId (carrying its RQE and title)', () => {
    const result = resolveDoctorSigningIdentity(
      makeDoctor(),
      APPOINTMENT_SPECIALTY_ID,
      undefined,
      OTHER_SPECIALTY_ID,
    )

    expect(result).toEqual({ crmNumber: '12345/SP', rqe: '222', specialtyName: 'Cardiologia' })
  })

  it('throws when the provided specialtyId is not registered for the doctor', () => {
    expect(() =>
      resolveDoctorSigningIdentity(makeDoctor(), APPOINTMENT_SPECIALTY_ID, undefined, 'unknown-specialty'),
    ).toThrow(UnprocessableEntityException)
  })

  it('returns an empty CRM number when the doctor has no primary CRM and none is chosen', () => {
    const doctor = makeDoctor({
      crms: [{ id: SECONDARY_CRM_ID, number: '67890', state: 'RJ', isPrimary: false }] as any,
    })

    const result = resolveDoctorSigningIdentity(doctor, APPOINTMENT_SPECIALTY_ID)

    expect(result.crmNumber).toBe('')
  })
})
