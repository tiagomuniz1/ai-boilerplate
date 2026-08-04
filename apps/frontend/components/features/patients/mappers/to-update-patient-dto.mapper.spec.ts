import { KinshipType, PatientGender } from '@app/shared'
import { toUpdatePatientDto } from './to-update-patient-dto.mapper'

describe('toUpdatePatientDto', () => {
  it('maps all defined fields to DTO correctly', () => {
    const input = {
      fullName: 'João Atualizado',
      email: 'joao.novo@example.com',
      phoneNumber: '(11) 88888-8888',
      birthDate: '1991-06-20',
      gender: PatientGender.FEMALE,
    }

    const dto = toUpdatePatientDto(input)

    expect(dto.fullName).toBe(input.fullName)
    expect(dto.email).toBe(input.email)
    expect(dto.phoneNumber).toBe(input.phoneNumber)
    expect(dto.birthDate).toBe(input.birthDate)
    expect(dto.gender).toBe(input.gender)
  })

  it('maps partial input with only fullName', () => {
    const dto = toUpdatePatientDto({ fullName: 'Novo Nome' })

    expect(dto.fullName).toBe('Novo Nome')
    expect(dto.email).toBeUndefined()
    expect(dto.phoneNumber).toBeUndefined()
  })

  it('maps empty input correctly', () => {
    const dto = toUpdatePatientDto({})

    expect(dto.fullName).toBeUndefined()
    expect(dto.email).toBeUndefined()
    expect(dto.gender).toBeUndefined()
  })

  it('maps documentNumber when adding a CPF later', () => {
    const dto = toUpdatePatientDto({ documentNumber: '12345678901' })

    expect(dto.documentNumber).toBe('12345678901')
  })

  it('maps responsiblePatientId and kinshipType when linking to a titular', () => {
    const dto = toUpdatePatientDto({ responsiblePatientId: 'responsible-uuid', kinshipType: KinshipType.FILHO })

    expect(dto.responsiblePatientId).toBe('responsible-uuid')
    expect(dto.kinshipType).toBe(KinshipType.FILHO)
  })

  it('maps explicit null responsiblePatientId and kinshipType when clearing the link', () => {
    const dto = toUpdatePatientDto({ responsiblePatientId: null, kinshipType: null })

    expect(dto.responsiblePatientId).toBeNull()
    expect(dto.kinshipType).toBeNull()
  })
})
