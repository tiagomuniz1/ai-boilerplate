import { PatientGender } from '@app/shared'
import { toPatientModel } from './to-patient-model.mapper'

const makeDto = () => ({
  id: 'uuid-1',
  fullName: 'João Silva',
  email: 'joao@example.com',
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  createdAt: '2024-01-15T10:00:00.000Z' as unknown as Date,
  updatedAt: '2024-01-16T10:00:00.000Z' as unknown as Date,
})

describe('toPatientModel', () => {
  it('maps all fields correctly', () => {
    const model = toPatientModel(makeDto())

    expect(model.id).toBe('uuid-1')
    expect(model.fullName).toBe('João Silva')
    expect(model.email).toBe('joao@example.com')
    expect(model.phoneNumber).toBe('(11) 99999-9999')
    expect(model.documentNumber).toBe('12345678901')
    expect(model.gender).toBe(PatientGender.MALE)
  })

  it('converts birthDate string to Date instance', () => {
    const model = toPatientModel(makeDto())

    expect(model.birthDate).toBeInstanceOf(Date)
    expect(model.birthDate.toISOString().startsWith('1990-05-15')).toBe(true)
  })

  it('converts createdAt string to Date instance', () => {
    const model = toPatientModel(makeDto())

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
  })

  it('converts updatedAt string to Date instance', () => {
    const model = toPatientModel(makeDto())

    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.updatedAt.toISOString()).toBe('2024-01-16T10:00:00.000Z')
  })

  it('maps gender female correctly', () => {
    const model = toPatientModel({ ...makeDto(), gender: PatientGender.FEMALE })
    expect(model.gender).toBe(PatientGender.FEMALE)
  })

  it('maps gender other correctly', () => {
    const model = toPatientModel({ ...makeDto(), gender: PatientGender.OTHER })
    expect(model.gender).toBe(PatientGender.OTHER)
  })
})
