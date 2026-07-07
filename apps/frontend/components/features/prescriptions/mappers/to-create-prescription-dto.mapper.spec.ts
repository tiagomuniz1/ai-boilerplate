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

  it('includes activeIngredientName and omits medicationId for manual items', () => {
    const input = {
      ...baseInput,
      items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp 8/8h' }],
    }
    const dto = toCreatePrescriptionDto(input)
    expect(dto.items[0].activeIngredientName).toBe('Amoxicilina')
    expect(dto.items[0]).not.toHaveProperty('medicationId')
  })

  it('omits activeIngredientName when not provided', () => {
    const dto = toCreatePrescriptionDto(baseInput)
    expect(dto.items[0]).not.toHaveProperty('activeIngredientName')
  })

  it('includes dosage when provided', () => {
    const input = { ...baseInput, items: [{ medicationId: 'med-1', dosage: '500mg', instructions: 'Tomar 1 cp' }] }
    const dto = toCreatePrescriptionDto(input)
    expect(dto.items[0].dosage).toBe('500mg')
  })

  it('omits dosage when not provided', () => {
    const dto = toCreatePrescriptionDto(baseInput)
    expect(dto.items[0]).not.toHaveProperty('dosage')
  })

  it('omits dosage when empty string', () => {
    const input = { ...baseInput, items: [{ medicationId: 'med-1', dosage: '', instructions: 'Tomar 1 cp' }] }
    const dto = toCreatePrescriptionDto(input)
    expect(dto.items[0]).not.toHaveProperty('dosage')
  })

  it('includes quantity when provided', () => {
    const input = { ...baseInput, items: [{ medicationId: 'med-1', quantity: '2 caixas', instructions: 'Tomar 1 cp' }] }
    const dto = toCreatePrescriptionDto(input)
    expect(dto.items[0].quantity).toBe('2 caixas')
  })

  it('omits quantity when not provided', () => {
    const dto = toCreatePrescriptionDto(baseInput)
    expect(dto.items[0]).not.toHaveProperty('quantity')
  })

  it('omits quantity when empty string', () => {
    const input = { ...baseInput, items: [{ medicationId: 'med-1', quantity: '', instructions: 'Tomar 1 cp' }] }
    const dto = toCreatePrescriptionDto(input)
    expect(dto.items[0]).not.toHaveProperty('quantity')
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

  it('omits crmId and specialtyId when not provided', () => {
    const dto = toCreatePrescriptionDto(baseInput)
    expect(dto).not.toHaveProperty('crmId')
    expect(dto).not.toHaveProperty('specialtyId')
  })

  it('includes crmId and specialtyId when provided', () => {
    const dto = toCreatePrescriptionDto({ ...baseInput, crmId: 'crm-2', specialtyId: 'spec-2' })
    expect(dto.crmId).toBe('crm-2')
    expect(dto.specialtyId).toBe('spec-2')
  })
})
