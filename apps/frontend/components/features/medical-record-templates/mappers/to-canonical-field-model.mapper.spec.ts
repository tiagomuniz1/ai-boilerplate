import { MedicalRecordFieldType } from '@app/shared'
import { toCanonicalFieldModel } from './to-canonical-field-model.mapper'

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: 'mmHg',
  description: 'PA sistólica',
  isActive: true,
  ...overrides,
})

describe('toCanonicalFieldModel', () => {
  it('maps all scalar fields', () => {
    const model = toCanonicalFieldModel(makeDto() as any)
    expect(model.id).toBe('uuid-1')
    expect(model.canonicalKey).toBe('blood_pressure')
    expect(model.label).toBe('Pressão arterial')
    expect(model.type).toBe(MedicalRecordFieldType.NUMBER)
    expect(model.unit).toBe('mmHg')
    expect(model.description).toBe('PA sistólica')
  })

  it('maps null options to null', () => {
    const model = toCanonicalFieldModel(makeDto() as any)
    expect(model.options).toBeNull()
  })

  it('maps options when present', () => {
    const dto = makeDto({
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'low', label: 'Baixo' }],
    })
    const model = toCanonicalFieldModel(dto as any)
    expect(model.options).toEqual([{ value: 'low', label: 'Baixo' }])
  })

  it('does not include isActive (not in ICanonicalFieldModel)', () => {
    const model = toCanonicalFieldModel(makeDto() as any)
    expect((model as any).isActive).toBeUndefined()
  })

  // O catálogo é global: o modelo não carrega escopo nenhum.
  it('does not carry a specialty scope', () => {
    const model = toCanonicalFieldModel(makeDto() as any)
    expect(model).not.toHaveProperty('specialtyId')
  })
})
