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
  sectionKey: '',
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

  it('includes placeholder when non-empty', () => {
    const dto = toUpdateTemplateDto({ fields: [makeField({ placeholder: 'Ex: dor' })] })
    expect(dto.fields![0].placeholder).toBe('Ex: dor')
  })

  it('includes helpText when non-empty', () => {
    const dto = toUpdateTemplateDto({ fields: [makeField({ helpText: 'Descreva' })] })
    expect(dto.fields![0].helpText).toBe('Descreva')
  })

  it('includes canonicalKey when canonical is true and key provided', () => {
    const dto = toUpdateTemplateDto({
      fields: [makeField({ canonical: true, canonicalKey: 'chief_complaint' })],
    })
    expect(dto.fields![0].canonicalKey).toBe('chief_complaint')
  })

  it('includes sectionKey when field belongs to a section', () => {
    const dto = toUpdateTemplateDto({
      fields: [makeField({ sectionKey: 'anamnese_xyz9' })],
    })
    expect(dto.fields![0].sectionKey).toBe('anamnese_xyz9')
  })

  it('maps sections when provided', () => {
    const dto = toUpdateTemplateDto({ sections: [{ title: 'Anamnese', order: 0 }] })
    expect(dto.sections).toHaveLength(1)
    expect(dto.sections![0].title).toBe('Anamnese')
    expect(dto.sections![0].order).toBe(0)
    expect(dto.sections![0].key).toBeUndefined()
  })

  it('preserves section key when provided', () => {
    const dto = toUpdateTemplateDto({
      sections: [{ key: 'anamnese_xyz9', title: 'Anamnese', order: 0 }],
    })
    expect(dto.sections![0].key).toBe('anamnese_xyz9')
  })

  it('omits sections key from dto when not provided', () => {
    const dto = toUpdateTemplateDto({ name: 'Nome' })
    expect(dto.sections).toBeUndefined()
  })
})
