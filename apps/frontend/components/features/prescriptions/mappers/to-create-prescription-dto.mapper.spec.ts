import { toCreatePrescriptionDto } from './to-create-prescription-dto.mapper'

describe('toCreatePrescriptionDto', () => {
  const baseInput = {
    appointmentId: 'appt-uuid',
    items: [
      { medicationId: 'med-1', instructions: 'Tomar 1 cp 8/8h' },
      { medicationId: 'med-2', instructions: 'Tomar 1 cp ao dia' },
    ],
  }

  it('maps appointmentId and items', () => {
    const dto = toCreatePrescriptionDto(baseInput)
    expect(dto.appointmentId).toBe('appt-uuid')
    expect(dto.items).toHaveLength(2)
    expect(dto.items[0]).toEqual({ medicationId: 'med-1', instructions: 'Tomar 1 cp 8/8h' })
    expect(dto.items[1]).toEqual({ medicationId: 'med-2', instructions: 'Tomar 1 cp ao dia' })
  })

  it('omits notes when not provided', () => {
    const dto = toCreatePrescriptionDto(baseInput)
    expect(dto).not.toHaveProperty('notes')
  })

  it('omits notes when empty string', () => {
    const dto = toCreatePrescriptionDto({ ...baseInput, notes: '' })
    expect(dto).not.toHaveProperty('notes')
  })

  it('includes notes when provided', () => {
    const dto = toCreatePrescriptionDto({ ...baseInput, notes: 'Retornar em 7 dias.' })
    expect(dto.notes).toBe('Retornar em 7 dias.')
  })
})
