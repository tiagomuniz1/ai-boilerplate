import { MedicalRecordFieldType } from '@app/shared'
import { toCanonicalFieldModel } from './to-canonical-field-model.mapper'

const makeDto = () => ({
  id: 'uuid-1',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: 'mmHg',
  description: 'Campo de pressão',
  isActive: true,
})

describe('toCanonicalFieldModel', () => {
  it('maps all fields correctly', () => {
    const model = toCanonicalFieldModel(makeDto())

    expect(model.id).toBe('uuid-1')
    expect(model.canonicalKey).toBe('blood_pressure')
    expect(model.label).toBe('Pressão arterial')
    expect(model.type).toBe(MedicalRecordFieldType.NUMBER)
    expect(model.unit).toBe('mmHg')
    expect(model.description).toBe('Campo de pressão')
    expect(model.isActive).toBe(true)
  })

  it('maps options array when present', () => {
    const dto = {
      ...makeDto(),
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'low', label: 'Baixo' }, { value: 'high', label: 'Alto' }],
    }
    const model = toCanonicalFieldModel(dto)

    expect(model.options).toHaveLength(2)
    expect(model.options![0].value).toBe('low')
    expect(model.options![1].label).toBe('Alto')
  })

  it('maps options as null when null', () => {
    const model = toCanonicalFieldModel(makeDto())
    expect(model.options).toBeNull()
  })

  // O catálogo é global: não há escopo a mapear.
  it('does not carry a specialty scope', () => {
    const model = toCanonicalFieldModel(makeDto())
    expect(model).not.toHaveProperty('specialtyId')
  })

  it('maps unit as null when null', () => {
    const model = toCanonicalFieldModel({ ...makeDto(), unit: null })
    expect(model.unit).toBeNull()
  })

  it('maps description as null when null', () => {
    const model = toCanonicalFieldModel({ ...makeDto(), description: null })
    expect(model.description).toBeNull()
  })

  it('maps isActive as false when false', () => {
    const model = toCanonicalFieldModel({ ...makeDto(), isActive: false })
    expect(model.isActive).toBe(false)
  })
})
