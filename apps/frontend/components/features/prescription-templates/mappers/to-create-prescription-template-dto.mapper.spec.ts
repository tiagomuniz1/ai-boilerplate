import { toCreatePrescriptionTemplateDto } from './to-create-prescription-template-dto.mapper'

describe('toCreatePrescriptionTemplateDto', () => {
  const baseInput = {
    name: 'Modelo A',
    items: [
      { medicationId: 'med-1', instructions: 'Tomar 1 cp 8/8h' },
      { medicationId: 'med-2', instructions: 'Tomar 1 cp ao dia' },
    ],
  }

  it('maps name and items', () => {
    const dto = toCreatePrescriptionTemplateDto(baseInput)
    expect(dto.name).toBe('Modelo A')
    expect(dto.items).toHaveLength(2)
    expect(dto.items[0]).toEqual({ medicationId: 'med-1', instructions: 'Tomar 1 cp 8/8h' })
  })

  it('includes activeIngredientName and omits medicationId for manual items', () => {
    const input = {
      ...baseInput,
      items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp 8/8h' }],
    }
    const dto = toCreatePrescriptionTemplateDto(input)
    expect(dto.items[0].activeIngredientName).toBe('Amoxicilina')
    expect(dto.items[0]).not.toHaveProperty('medicationId')
  })

  it('omits activeIngredientName when not provided', () => {
    const dto = toCreatePrescriptionTemplateDto(baseInput)
    expect(dto.items[0]).not.toHaveProperty('activeIngredientName')
  })

  it('includes dosage when provided', () => {
    const input = { ...baseInput, items: [{ medicationId: 'med-1', dosage: '500mg', instructions: 'Tomar 1 cp' }] }
    const dto = toCreatePrescriptionTemplateDto(input)
    expect(dto.items[0].dosage).toBe('500mg')
  })

  it('omits dosage when not provided', () => {
    const dto = toCreatePrescriptionTemplateDto(baseInput)
    expect(dto.items[0]).not.toHaveProperty('dosage')
  })

  it('includes quantity when provided', () => {
    const input = { ...baseInput, items: [{ medicationId: 'med-1', quantity: '2 caixas', instructions: 'Tomar 1 cp' }] }
    const dto = toCreatePrescriptionTemplateDto(input)
    expect(dto.items[0].quantity).toBe('2 caixas')
  })

  it('omits quantity when not provided', () => {
    const dto = toCreatePrescriptionTemplateDto(baseInput)
    expect(dto.items[0]).not.toHaveProperty('quantity')
  })

  it('omits notes when not provided', () => {
    const dto = toCreatePrescriptionTemplateDto(baseInput)
    expect(dto).not.toHaveProperty('notes')
  })

  it('includes notes when provided', () => {
    const dto = toCreatePrescriptionTemplateDto({ ...baseInput, notes: 'Retornar em 7 dias.' })
    expect(dto.notes).toBe('Retornar em 7 dias.')
  })

  it('omits doctorId when not provided', () => {
    const dto = toCreatePrescriptionTemplateDto(baseInput)
    expect(dto).not.toHaveProperty('doctorId')
  })

  it('includes doctorId when provided', () => {
    const dto = toCreatePrescriptionTemplateDto({ ...baseInput, doctorId: 'doctor-uuid' })
    expect(dto.doctorId).toBe('doctor-uuid')
  })
})
