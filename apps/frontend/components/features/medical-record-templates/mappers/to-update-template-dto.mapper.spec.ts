import { MedicalRecordFieldType } from '@app/shared'
import { toUpdateTemplateDto } from './to-update-template-dto.mapper'

const makeField = (overrides = {}) => ({
  label: 'Sintoma',
  type: MedicalRecordFieldType.TEXT,
  required: false,
  order: 0,
  options: [],
  placeholder: '',
  helpText: '',
  canonical: false,
  canonicalKey: '',
  ...overrides,
})

describe('toUpdateTemplateDto', () => {
  it('returns empty object when no fields provided', () => {
    expect(toUpdateTemplateDto({})).toEqual({})
  })

  it('maps name when provided', () => {
    expect(toUpdateTemplateDto({ name: 'Novo nome' }).name).toBe('Novo nome')
  })

  it('maps isActive when provided', () => {
    expect(toUpdateTemplateDto({ isActive: false }).isActive).toBe(false)
  })

  it('maps fields when provided', () => {
    const dto = toUpdateTemplateDto({ fields: [makeField()] })
    expect(dto.fields).toHaveLength(1)
  })

  it('preserves key for existing fields in update', () => {
    const dto = toUpdateTemplateDto({ fields: [makeField({ key: 'existing-key' })] })
    expect(dto.fields![0].key).toBe('existing-key')
  })

  it('omits key when undefined (new field in edit)', () => {
    const dto = toUpdateTemplateDto({ fields: [makeField()] })
    expect(dto.fields![0].key).toBeUndefined()
  })

  it('includes options when non-empty', () => {
    const dto = toUpdateTemplateDto({
      fields: [makeField({ options: [{ value: 'a', label: 'A' }] })],
    })
    expect(dto.fields![0].options).toEqual([{ value: 'a', label: 'A' }])
  })

  it('omits undefined fields', () => {
    const dto = toUpdateTemplateDto({ name: 'Nome' })
    expect(dto.fields).toBeUndefined()
    expect(dto.isActive).toBeUndefined()
  })
})
