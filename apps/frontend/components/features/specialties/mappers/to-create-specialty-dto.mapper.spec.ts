import { toCreateSpecialtyDto } from './to-create-specialty-dto.mapper'

describe('toCreateSpecialtyDto', () => {
  it('maps name and description to DTO correctly', () => {
    const dto = toCreateSpecialtyDto({ name: 'Cardiologia', description: 'Do coração' })

    expect(dto.name).toBe('Cardiologia')
    expect(dto.description).toBe('Do coração')
  })

  it('maps without description when undefined', () => {
    const dto = toCreateSpecialtyDto({ name: 'Cardiologia' })

    expect(dto.name).toBe('Cardiologia')
    expect(dto.description).toBeUndefined()
  })
})
