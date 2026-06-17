import { toCreateDoctorDto } from './to-create-doctor-dto.mapper'

describe('toCreateDoctorDto', () => {
  const input = {
    userId: 'user-uuid-1',
    crmNumber: '12345/SP',
    specialtyIds: ['spec-uuid-1', 'spec-uuid-2'],
    bio: 'Bio do médico.',
  }

  it('maps all fields to DTO correctly', () => {
    const dto = toCreateDoctorDto(input)

    expect(dto.userId).toBe(input.userId)
    expect(dto.crmNumber).toBe(input.crmNumber)
    expect(dto.specialtyIds).toEqual(input.specialtyIds)
    expect(dto.bio).toBe(input.bio)
  })

  it('maps undefined bio correctly', () => {
    const dto = toCreateDoctorDto({ ...input, bio: undefined })

    expect(dto.bio).toBeUndefined()
  })

  it('maps fullName and email when creating a new user', () => {
    const newUserInput = {
      fullName: 'Maria Áurea de Andrade Borba',
      email: 'maria.aurea@example.com',
      crmNumber: '28250/PE',
      specialtyIds: ['spec-uuid-1'],
      bio: 'Bio da médica.',
    }

    const dto = toCreateDoctorDto(newUserInput)

    expect(dto.fullName).toBe(newUserInput.fullName)
    expect(dto.email).toBe(newUserInput.email)
    expect(dto.userId).toBeUndefined()
    expect(dto.crmNumber).toBe(newUserInput.crmNumber)
  })
})
