import { PatientGender } from '@app/shared'
import { toCreatePatientDto } from './to-create-patient-dto.mapper'

describe('toCreatePatientDto', () => {
  const input = {
    fullName: 'João Silva',
    email: 'joao@example.com',
    phoneNumber: '(11) 99999-9999',
    birthDate: '1990-05-15',
    documentNumber: '12345678901',
    gender: PatientGender.MALE,
  }

  it('maps all fields to DTO correctly', () => {
    const dto = toCreatePatientDto(input)

    expect(dto.fullName).toBe(input.fullName)
    expect(dto.email).toBe(input.email)
    expect(dto.phoneNumber).toBe(input.phoneNumber)
    expect(dto.birthDate).toBe(input.birthDate)
    expect(dto.documentNumber).toBe(input.documentNumber)
    expect(dto.gender).toBe(input.gender)
  })

  it('maps userId when linking to an existing user', () => {
    const dto = toCreatePatientDto({
      userId: 'user-uuid-1',
      phoneNumber: input.phoneNumber,
      birthDate: input.birthDate,
      documentNumber: input.documentNumber,
      gender: input.gender,
    })

    expect(dto.userId).toBe('user-uuid-1')
  })
})
