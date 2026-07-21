import { toCreateProfessionalDto } from './to-create-professional-dto.mapper'

describe('toCreateProfessionalDto', () => {
  const input = {
    userId: 'user-uuid-1',
    registrations: [{ number: '12345', state: 'SP', isPrimary: true }],
    specialties: [
      { specialtyId: 'spec-uuid-1', registryNumber: '6789' },
      { specialtyId: 'spec-uuid-2', registryNumber: undefined },
    ],
    bio: 'Bio do profissional.',
  }

  it('maps all fields to DTO correctly', () => {
    const dto = toCreateProfessionalDto(input)

    expect(dto.userId).toBe(input.userId)
    expect(dto.registrations).toEqual(input.registrations)
    expect(dto.specialties).toEqual(input.specialties)
    expect(dto.bio).toBe(input.bio)
  })

  it('maps undefined bio correctly', () => {
    const dto = toCreateProfessionalDto({ ...input, bio: undefined })

    expect(dto.bio).toBeUndefined()
  })

  it('maps fullName and email when creating a new user', () => {
    const newUserInput = {
      fullName: 'Maria Áurea de Andrade Borba',
      email: 'maria.aurea@example.com',
      registrations: [{ number: '28250', state: 'PE', isPrimary: true }],
      specialties: [{ specialtyId: 'spec-uuid-1' }],
      bio: 'Bio da médica.',
    }

    const dto = toCreateProfessionalDto(newUserInput)

    expect(dto.fullName).toBe(newUserInput.fullName)
    expect(dto.email).toBe(newUserInput.email)
    expect(dto.userId).toBeUndefined()
    expect(dto.registrations).toEqual(newUserInput.registrations)
  })
})
