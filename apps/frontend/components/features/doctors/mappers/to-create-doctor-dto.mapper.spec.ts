import { toCreateDoctorDto } from './to-create-doctor-dto.mapper'

describe('toCreateDoctorDto', () => {
  const input = {
    userId: 'user-uuid-1',
    crms: [{ number: '12345', state: 'SP', isPrimary: true }],
    specialties: [
      { specialtyId: 'spec-uuid-1', rqe: '6789' },
      { specialtyId: 'spec-uuid-2', rqe: undefined },
    ],
    bio: 'Bio do médico.',
  }

  it('maps all fields to DTO correctly', () => {
    const dto = toCreateDoctorDto(input)

    expect(dto.userId).toBe(input.userId)
    expect(dto.crms).toEqual(input.crms)
    expect(dto.specialties).toEqual(input.specialties)
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
      crms: [{ number: '28250', state: 'PE', isPrimary: true }],
      specialties: [{ specialtyId: 'spec-uuid-1' }],
      bio: 'Bio da médica.',
    }

    const dto = toCreateDoctorDto(newUserInput)

    expect(dto.fullName).toBe(newUserInput.fullName)
    expect(dto.email).toBe(newUserInput.email)
    expect(dto.userId).toBeUndefined()
    expect(dto.crms).toEqual(newUserInput.crms)
  })
})
