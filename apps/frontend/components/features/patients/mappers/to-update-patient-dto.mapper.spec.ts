import { PatientGender } from '@app/shared'
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
})
