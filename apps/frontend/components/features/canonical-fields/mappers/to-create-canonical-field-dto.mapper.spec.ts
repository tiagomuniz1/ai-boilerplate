import { MedicalRecordFieldType } from '@app/shared'
import { toCreateCanonicalFieldDto } from './to-create-canonical-field-dto.mapper'

describe('toCreateCanonicalFieldDto', () => {
  it('maps required fields', () => {
    const dto = toCreateCanonicalFieldDto({
      canonicalKey: 'blood_pressure',
      label: 'Pressão arterial',
      type: MedicalRecordFieldType.NUMBER,
    })

    expect(dto.canonicalKey).toBe('blood_pressure')
    expect(dto.label).toBe('Pressão arterial')
    expect(dto.type).toBe(MedicalRecordFieldType.NUMBER)
  })

  it('includes options for SELECT type', () => {
    const dto = toCreateCanonicalFieldDto({
      canonicalKey: 'risk',
      label: 'Risco',
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'low', label: 'Baixo' }],
    })

    expect(dto.options).toEqual([{ value: 'low', label: 'Baixo' }])
  })

  it('includes options for MULTISELECT type', () => {
    const dto = toCreateCanonicalFieldDto({
      canonicalKey: 'tags',
      label: 'Tags',
      type: MedicalRecordFieldType.MULTISELECT,
      options: [{ value: 'a', label: 'A' }],
    })

    expect(dto.options).toEqual([{ value: 'a', label: 'A' }])
  })

  it('omits options for non-select types', () => {
    const dto = toCreateCanonicalFieldDto({
      canonicalKey: 'weight',
      label: 'Peso',
      type: MedicalRecordFieldType.NUMBER,
      options: [{ value: 'x', label: 'X' }],
    })

    expect(dto.options).toBeUndefined()
  })

  it('includes optional unit and description when provided', () => {
    const dto = toCreateCanonicalFieldDto({
      canonicalKey: 'blood_pressure',
      label: 'Pressão',
      type: MedicalRecordFieldType.NUMBER,
      unit: 'mmHg',
      description: 'Campo de pressão',
    })

    expect(dto.unit).toBe('mmHg')
    expect(dto.description).toBe('Campo de pressão')
  })

  it('omits optional fields when undefined', () => {
    const dto = toCreateCanonicalFieldDto({
      canonicalKey: 'height',
      label: 'Altura',
      type: MedicalRecordFieldType.NUMBER,
    })

    expect(dto.unit).toBeUndefined()
    expect(dto.description).toBeUndefined()
    expect(dto.options).toBeUndefined()
  })
})
