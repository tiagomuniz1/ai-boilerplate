import { toPrescriptionModel } from './to-prescription-model.mapper'

const makeDto = () => ({
  id: 'rx-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Maria Santos',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. João',
  issuedAt: '2026-06-28T10:00:00.000Z' as unknown as Date,
  items: [
    { medicationId: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', dosage: '500mg', quantity: '1 caixa', instructions: 'Tomar 1 cp 8/8h' },
    { medicationId: null, name: 'Manipulado X', activeIngredient: null, dosage: null, quantity: null, instructions: 'Tomar 1 cp ao dia' },
  ],
  notes: 'Retornar em 7 dias.',
  createdAt: '2026-06-28T10:00:00.000Z' as unknown as Date,
})

describe('toPrescriptionModel', () => {
  it('maps all scalar fields correctly', () => {
    const model = toPrescriptionModel(makeDto() as any)
    expect(model.id).toBe('rx-uuid')
    expect(model.appointmentId).toBe('appt-uuid')
    expect(model.patientId).toBe('patient-uuid')
    expect(model.patientName).toBe('Maria Santos')
    expect(model.professionalId).toBe('doctor-uuid')
    expect(model.professionalName).toBe('Dr. João')
    expect(model.notes).toBe('Retornar em 7 dias.')
  })

  it('converts issuedAt string to Date', () => {
    const model = toPrescriptionModel(makeDto() as any)
    expect(model.issuedAt).toBeInstanceOf(Date)
    expect(model.issuedAt.toISOString()).toBe('2026-06-28T10:00:00.000Z')
  })

  it('converts createdAt string to Date', () => {
    const model = toPrescriptionModel(makeDto() as any)
    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2026-06-28T10:00:00.000Z')
  })

  it('maps items with all fields', () => {
    const model = toPrescriptionModel(makeDto() as any)
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
    const model = toPrescriptionModel(makeDto() as any)
    expect(model.items[1].medicationId).toBeNull()
    expect(model.items[1].activeIngredient).toBeNull()
  })

  it('preserves null notes', () => {
    const dto = { ...makeDto(), notes: null }
    const model = toPrescriptionModel(dto as any)
    expect(model.notes).toBeNull()
  })
})
