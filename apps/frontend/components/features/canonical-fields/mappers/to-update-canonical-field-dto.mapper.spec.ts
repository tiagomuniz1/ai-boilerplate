import { MedicalRecordFieldType } from '@app/shared'
import { toUpdateCanonicalFieldDto } from './to-update-canonical-field-dto.mapper'

describe('toUpdateCanonicalFieldDto', () => {
  it('returns empty object when no fields provided', () => {
    const dto = toUpdateCanonicalFieldDto({})
    expect(dto).toEqual({})
  })

  it('maps label when provided', () => {
    const dto = toUpdateCanonicalFieldDto({ label: 'Novo rótulo' })
    expect(dto.label).toBe('Novo rótulo')
  })

  it('maps type when provided', () => {
    const dto = toUpdateCanonicalFieldDto({ type: MedicalRecordFieldType.BOOLEAN })
    expect(dto.type).toBe(MedicalRecordFieldType.BOOLEAN)
  })

  it('maps isActive when provided', () => {
    expect(toUpdateCanonicalFieldDto({ isActive: false }).isActive).toBe(false)
    expect(toUpdateCanonicalFieldDto({ isActive: true }).isActive).toBe(true)
  })

  it('maps unit and description when provided', () => {
    const dto = toUpdateCanonicalFieldDto({ unit: 'kg', description: 'Desc' })
    expect(dto.unit).toBe('kg')
    expect(dto.description).toBe('Desc')
  })

  it('includes options when type is SELECT and options provided', () => {
    const dto = toUpdateCanonicalFieldDto({
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'low', label: 'Baixo' }],
    })
    expect(dto.options).toEqual([{ value: 'low', label: 'Baixo' }])
  })

  it('includes options when type is MULTISELECT and options provided', () => {
    const dto = toUpdateCanonicalFieldDto({
      type: MedicalRecordFieldType.MULTISELECT,
      options: [{ value: 'a', label: 'A' }],
    })
    expect(dto.options).toEqual([{ value: 'a', label: 'A' }])
  })

  it('omits options when type is not SELECT/MULTISELECT', () => {
    const dto = toUpdateCanonicalFieldDto({
      type: MedicalRecordFieldType.NUMBER,
      options: [{ value: 'x', label: 'X' }],
    })
    expect(dto.options).toBeUndefined()
  })

  it('omits options when type is not provided even if options are present', () => {
    const dto = toUpdateCanonicalFieldDto({ options: [{ value: 'x', label: 'X' }] })
    expect(dto.options).toBeUndefined()
  })

  it('omits undefined fields', () => {
    const dto = toUpdateCanonicalFieldDto({ label: 'Label' })
    expect(dto.type).toBeUndefined()
    expect(dto.unit).toBeUndefined()
    expect(dto.description).toBeUndefined()
    expect(dto.isActive).toBeUndefined()
  })
})
