import { toCreateExamRequestDto } from './to-create-exam-request-dto.mapper'

describe('toCreateExamRequestDto', () => {
  const baseInput = {
    appointmentId: 'appt-uuid',
    items: [{ name: 'Hemograma completo' }],
  }

  it('maps appointmentId and items', () => {
    const dto = toCreateExamRequestDto(baseInput)
    expect(dto.appointmentId).toBe('appt-uuid')
    expect(dto.items).toEqual([{ name: 'Hemograma completo' }])
  })

  it('includes observations per item when provided', () => {
    const dto = toCreateExamRequestDto({
      appointmentId: 'appt-uuid',
      items: [{ name: 'Hemograma completo', observations: 'Jejum de 8h' }],
    })
    expect(dto.items[0]).toEqual({ name: 'Hemograma completo', observations: 'Jejum de 8h' })
  })

  it('omits observations for an item when not provided', () => {
    const dto = toCreateExamRequestDto(baseInput)
    expect(dto.items[0]).not.toHaveProperty('observations')
  })

  it('maps multiple items preserving order', () => {
    const dto = toCreateExamRequestDto({
      appointmentId: 'appt-uuid',
      items: [
        { name: 'Hemograma completo' },
        { name: 'Glicemia em jejum', observations: 'Jejum de 8h' },
        { name: 'Raio-X de tórax' },
      ],
    })
    expect(dto.items).toHaveLength(3)
    expect(dto.items[1]).toEqual({ name: 'Glicemia em jejum', observations: 'Jejum de 8h' })
  })

  it('omits notes when not provided', () => {
    const dto = toCreateExamRequestDto(baseInput)
    expect(dto).not.toHaveProperty('notes')
  })

  it('omits notes when empty string', () => {
    const dto = toCreateExamRequestDto({ ...baseInput, notes: '' })
    expect(dto).not.toHaveProperty('notes')
  })

  it('includes notes when provided', () => {
    const dto = toCreateExamRequestDto({ ...baseInput, notes: 'Retornar em 7 dias' })
    expect(dto.notes).toBe('Retornar em 7 dias')
  })

  it('omits registrationId and specialtyId when not provided', () => {
    const dto = toCreateExamRequestDto(baseInput)
    expect(dto).not.toHaveProperty('registrationId')
    expect(dto).not.toHaveProperty('specialtyId')
  })

  it('includes registrationId and specialtyId when provided', () => {
    const dto = toCreateExamRequestDto({ ...baseInput, registrationId: 'crm-2', specialtyId: 'spec-2' })
    expect(dto.registrationId).toBe('crm-2')
    expect(dto.specialtyId).toBe('spec-2')
  })
})
