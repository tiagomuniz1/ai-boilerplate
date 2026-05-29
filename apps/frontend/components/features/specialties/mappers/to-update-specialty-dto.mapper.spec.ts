import { toUpdateSpecialtyDto } from './to-update-specialty-dto.mapper'

describe('toUpdateSpecialtyDto', () => {
  it('maps all fields to DTO correctly', () => {
    const dto = toUpdateSpecialtyDto({ name: 'Neurologia', description: 'Do sistema nervoso' })

    expect(dto.name).toBe('Neurologia')
    expect(dto.description).toBe('Do sistema nervoso')
  })

  it('maps undefined fields correctly', () => {
    const dto = toUpdateSpecialtyDto({})

    expect(dto.name).toBeUndefined()
    expect(dto.description).toBeUndefined()
  })

  it('passes null for description when explicitly set to null', () => {
    const dto = toUpdateSpecialtyDto({ description: null })

    expect(dto.description).toBeNull()
  })

  it('maps partial update correctly', () => {
    const dto = toUpdateSpecialtyDto({ name: 'Ortopedia' })

    expect(dto.name).toBe('Ortopedia')
    expect(dto.description).toBeUndefined()
  })
})
