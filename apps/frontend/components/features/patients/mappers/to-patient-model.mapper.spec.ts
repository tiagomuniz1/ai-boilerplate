import { KinshipType, PatientGender } from '@app/shared'
import { toPatientModel } from './to-patient-model.mapper'

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'João Silva', email: 'joao@example.com', isActive: true },
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
  dependents: [],
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

  it('lands the birth date on the day it names, not the day before', () => {
    const model = toPatientModel(makeDto())

    // `new Date('1990-05-15')` parses as UTC midnight, which in UTC-3 renders as
    // 14/05 — the patients list and detail page showed every birth date one day
    // early. Asserted on local calendar parts, since toISOString() reintroduces
    // exactly the UTC conversion this guards against.
    expect(model.birthDate.getFullYear()).toBe(1990)
    expect(model.birthDate.getMonth()).toBe(4)
    expect(model.birthDate.getDate()).toBe(15)
    expect(model.birthDate.toLocaleDateString('pt-BR')).toBe('15/05/1990')
  })

  it('converts birthDate string to Date instance', () => {
    const model = toPatientModel(makeDto())

    expect(model.birthDate).toBeInstanceOf(Date)
    expect(model.birthDate.getDate()).toBe(15)
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

  it('maps null documentNumber and kinship fields when patient has no vinculation', () => {
    const model = toPatientModel(makeDto())

    expect(model.responsiblePatientId).toBeNull()
    expect(model.kinshipType).toBeNull()
    expect(model.responsiblePatient).toBeNull()
    expect(model.dependents).toEqual([])
  })

  it('maps a dependent patient (no documentNumber, linked to a responsible patient)', () => {
    const model = toPatientModel({
      ...makeDto(),
      documentNumber: null,
      responsiblePatientId: 'responsible-uuid',
      kinshipType: KinshipType.FILHO,
      responsiblePatient: { id: 'responsible-uuid', fullName: 'Maria Silva', documentNumber: '98765432100' },
    })

    expect(model.documentNumber).toBeNull()
    expect(model.responsiblePatientId).toBe('responsible-uuid')
    expect(model.kinshipType).toBe(KinshipType.FILHO)
    expect(model.responsiblePatient).toEqual({
      id: 'responsible-uuid',
      fullName: 'Maria Silva',
      documentNumber: '98765432100',
    })
  })

  it('maps a titular patient with dependents', () => {
    const model = toPatientModel({
      ...makeDto(),
      dependents: [{ id: 'dependent-uuid', fullName: 'Bebê Silva', kinshipType: KinshipType.FILHO }],
    })

    expect(model.dependents).toEqual([
      { id: 'dependent-uuid', fullName: 'Bebê Silva', kinshipType: KinshipType.FILHO },
    ])
  })
})
