import { toCreateDoctorDto } from './to-create-doctor-dto.mapper'

describe('toCreateDoctorDto', () => {
  const input = {
    userId: 'user-uuid-1',
    crmNumber: '12345/SP',
    specialty: 'Cardiologia',
    bio: 'Bio do médico.',
  }

  it('maps all fields to DTO correctly', () => {
    const dto = toCreateDoctorDto(input)

    expect(dto.userId).toBe(input.userId)
    expect(dto.crmNumber).toBe(input.crmNumber)
    expect(dto.specialty).toBe(input.specialty)
    expect(dto.bio).toBe(input.bio)
  })

  it('maps undefined bio correctly', () => {
    const dto = toCreateDoctorDto({ ...input, bio: undefined })

    expect(dto.bio).toBeUndefined()
  })
})
