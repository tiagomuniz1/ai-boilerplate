import { MedicalRecordFieldType } from '@app/shared'
import { toCreateTemplateDto } from './to-create-template-dto.mapper'

const makeField = (overrides = {}) => ({
  label: 'Sintoma',
  type: MedicalRecordFieldType.TEXT,
  required: true,
  order: 0,
  options: [],
  placeholder: '',
  helpText: '',
  canonical: false,
  canonicalKey: '',
  sectionKey: '',
  ...overrides,
})

const baseInput = {
  specialtyId: 'spec-uuid',
  name: 'Anamnese',
  sections: [] as any[],
}

describe('toCreateTemplateDto', () => {
  it('maps specialtyId and name', () => {
    const dto = toCreateTemplateDto({ ...baseInput, fields: [makeField()] })
    expect(dto.specialtyId).toBe('spec-uuid')
    expect(dto.name).toBe('Anamnese')
  })

  it('does NOT include key in fields (backend generates it)', () => {
    const dto = toCreateTemplateDto({ ...baseInput, fields: [makeField({ key: 'some-key' })] })
    expect(dto.fields[0].key).toBeUndefined()
  })

  it('maps field label, type, required, order, canonical', () => {
    const dto = toCreateTemplateDto({
      ...baseInput,
      fields: [makeField({ label: 'Sintoma', type: MedicalRecordFieldType.NUMBER, required: false, order: 1 })],
    })
    const f = dto.fields[0]
    expect(f.label).toBe('Sintoma')
    expect(f.type).toBe(MedicalRecordFieldType.NUMBER)
    expect(f.required).toBe(false)
    expect(f.order).toBe(1)
    expect(f.canonical).toBe(false)
  })

  it('includes options when non-empty', () => {
    const dto = toCreateTemplateDto({
      ...baseInput,
      fields: [makeField({ type: MedicalRecordFieldType.SELECT, options: [{ value: 'low', label: 'Baixo' }] })],
    })
    expect(dto.fields[0].options).toEqual([{ value: 'low', label: 'Baixo' }])
  })

  it('omits options when empty array', () => {
    const dto = toCreateTemplateDto({ ...baseInput, fields: [makeField({ options: [] })] })
    expect(dto.fields[0].options).toBeUndefined()
  })

  it('includes canonicalKey when field is canonical', () => {
    const dto = toCreateTemplateDto({
      ...baseInput,
      fields: [makeField({ canonical: true, canonicalKey: 'blood_pressure' })],
    })
    expect(dto.fields[0].canonicalKey).toBe('blood_pressure')
  })

  it('omits canonicalKey when field is not canonical', () => {
    const dto = toCreateTemplateDto({
      ...baseInput,
      fields: [makeField({ canonical: false, canonicalKey: '' })],
    })
    expect(dto.fields[0].canonicalKey).toBeUndefined()
  })

  it('includes placeholder and helpText when non-empty', () => {
    const dto = toCreateTemplateDto({
      ...baseInput,
      fields: [makeField({ placeholder: 'Informe aqui', helpText: 'Dica' })],
    })
    expect(dto.fields[0].placeholder).toBe('Informe aqui')
    expect(dto.fields[0].helpText).toBe('Dica')
  })

  it('includes sectionKey when field belongs to a section', () => {
    const dto = toCreateTemplateDto({
      ...baseInput,
      fields: [makeField({ sectionKey: 'anamnese_abc1' })],
    })
    expect(dto.fields[0].sectionKey).toBe('anamnese_abc1')
  })

  it('omits sectionKey when empty (flat field)', () => {
    const dto = toCreateTemplateDto({ ...baseInput, fields: [makeField({ sectionKey: '' })] })
    expect(dto.fields[0].sectionKey).toBeUndefined()
  })

  it('maps sections with title and order', () => {
    const dto = toCreateTemplateDto({
      ...baseInput,
      sections: [{ title: 'Queixa principal', order: 0 }],
      fields: [makeField()],
    })
    expect(dto.sections).toHaveLength(1)
    expect(dto.sections![0].title).toBe('Queixa principal')
    expect(dto.sections![0].order).toBe(0)
    expect(dto.sections![0].key).toBeUndefined()
  })

  it('maps empty sections array', () => {
    const dto = toCreateTemplateDto({ ...baseInput, fields: [makeField()] })
    expect(dto.sections).toEqual([])
  })
})
