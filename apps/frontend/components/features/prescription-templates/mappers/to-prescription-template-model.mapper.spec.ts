import { toPrescriptionTemplateModel } from './to-prescription-template-model.mapper'

const makeDto = () => ({
  id: 'tpl-uuid',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. João',
  name: 'Hipertensão leve',
  items: [
    { medicationId: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', dosage: '500mg', quantity: '1 caixa', instructions: 'Tomar 1 cp 8/8h' },
    { medicationId: null, name: 'Manipulado X', activeIngredient: null, dosage: null, quantity: null, instructions: 'Tomar 1 cp ao dia' },
  ],
  notes: 'Retornar em 7 dias.',
  isActive: true,
  createdAt: '2026-06-28T10:00:00.000Z' as unknown as Date,
})

describe('toPrescriptionTemplateModel', () => {
  it('maps all scalar fields correctly', () => {
    const model = toPrescriptionTemplateModel(makeDto() as any)
    expect(model.id).toBe('tpl-uuid')
    expect(model.professionalId).toBe('doctor-uuid')
    expect(model.professionalName).toBe('Dr. João')
    expect(model.name).toBe('Hipertensão leve')
    expect(model.notes).toBe('Retornar em 7 dias.')
    expect(model.isActive).toBe(true)
  })

  it('converts createdAt string to Date', () => {
    const model = toPrescriptionTemplateModel(makeDto() as any)
    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2026-06-28T10:00:00.000Z')
  })

  it('maps items with all fields', () => {
    const model = toPrescriptionTemplateModel(makeDto() as any)
    expect(model.items).toHaveLength(2)
    expect(model.items[0]).toEqual({
      medicationId: 'med-uuid',
      name: 'Dipirona 500mg',
      activeIngredient: 'dipirona sódica',
      dosage: '500mg',
      quantity: '1 caixa',
      instructions: 'Tomar 1 cp 8/8h',
    })
  })

  it('maps item with null medicationId and null activeIngredient', () => {
    const model = toPrescriptionTemplateModel(makeDto() as any)
    expect(model.items[1].medicationId).toBeNull()
    expect(model.items[1].activeIngredient).toBeNull()
  })

  it('preserves null notes', () => {
    const dto = { ...makeDto(), notes: null }
    const model = toPrescriptionTemplateModel(dto as any)
    expect(model.notes).toBeNull()
  })

  it('preserves isActive false', () => {
    const dto = { ...makeDto(), isActive: false }
    const model = toPrescriptionTemplateModel(dto as any)
    expect(model.isActive).toBe(false)
  })
})
