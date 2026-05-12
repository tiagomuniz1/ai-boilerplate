import { toUpdateDoctorDto } from './to-update-doctor-dto.mapper'

describe('toUpdateDoctorDto', () => {
  it('maps all fields to DTO correctly', () => {
    const input = {
      crmNumber: '12345/SP',
      specialty: 'Neurologia',
      bio: 'Bio atualizada.',
    }

    const dto = toUpdateDoctorDto(input)

    expect(dto.crmNumber).toBe(input.crmNumber)
    expect(dto.specialty).toBe(input.specialty)
    expect(dto.bio).toBe(input.bio)
  })

  it('maps undefined fields correctly', () => {
    const dto = toUpdateDoctorDto({})

    expect(dto.crmNumber).toBeUndefined()
    expect(dto.specialty).toBeUndefined()
    expect(dto.bio).toBeUndefined()
  })

  it('maps partial update correctly', () => {
    const dto = toUpdateDoctorDto({ specialty: 'Ortopedia' })

    expect(dto.specialty).toBe('Ortopedia')
    expect(dto.crmNumber).toBeUndefined()
  })
})
