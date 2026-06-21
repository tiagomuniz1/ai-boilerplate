import { MedicalRecordFieldType } from '@app/shared'
import { toTemplateModel, toPaginatedTemplatesModel } from './to-template-model.mapper'

const makeFieldDto = (overrides = {}) => ({
  key: 'field_key_1',
  label: 'Sintoma principal',
  type: MedicalRecordFieldType.TEXT,
  required: true,
  order: 0,
  options: null,
  placeholder: null,
  helpText: null,
  canonical: false,
  canonicalKey: null,
  ...overrides,
})

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [makeFieldDto()],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

describe('toTemplateModel', () => {
  it('maps all scalar fields', () => {
    const model = toTemplateModel(makeDto() as any)
    expect(model.id).toBe('uuid-1')
    expect(model.specialtyId).toBe('spec-uuid')
    expect(model.specialtyName).toBe('Cardiologia')
    expect(model.name).toBe('Anamnese Cardíaca')
    expect(model.isActive).toBe(true)
  })

  it('converts createdAt and updatedAt to Date', () => {
    const model = toTemplateModel(makeDto() as any)
    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
  })

  it('maps field key', () => {
    const model = toTemplateModel(makeDto() as any)
    expect(model.fields[0].key).toBe('field_key_1')
  })

  it('maps field label, type, required, order', () => {
    const model = toTemplateModel(makeDto() as any)
    const f = model.fields[0]
    expect(f.label).toBe('Sintoma principal')
    expect(f.type).toBe(MedicalRecordFieldType.TEXT)
    expect(f.required).toBe(true)
    expect(f.order).toBe(0)
  })

  it('maps field options when present', () => {
    const dto = makeDto({
      fields: [makeFieldDto({ options: [{ value: 'low', label: 'Baixo' }] })],
    })
    const model = toTemplateModel(dto as any)
    expect(model.fields[0].options).toEqual([{ value: 'low', label: 'Baixo' }])
  })

  it('maps null options to null', () => {
    const model = toTemplateModel(makeDto() as any)
    expect(model.fields[0].options).toBeNull()
  })

  it('maps placeholder and helpText', () => {
    const dto = makeDto({
      fields: [makeFieldDto({ placeholder: 'Digite aqui', helpText: 'Exemplo: dor no peito' })],
    })
    const model = toTemplateModel(dto as any)
    expect(model.fields[0].placeholder).toBe('Digite aqui')
    expect(model.fields[0].helpText).toBe('Exemplo: dor no peito')
  })

  it('maps canonical flag and canonicalKey', () => {
    const dto = makeDto({
      fields: [makeFieldDto({ canonical: true, canonicalKey: 'blood_pressure' })],
    })
    const model = toTemplateModel(dto as any)
    expect(model.fields[0].canonical).toBe(true)
    expect(model.fields[0].canonicalKey).toBe('blood_pressure')
  })

  it('maps undefined placeholder/helpText/canonicalKey to null', () => {
    const dto = makeDto({ fields: [makeFieldDto({ placeholder: undefined, helpText: undefined, canonicalKey: undefined })] })
    const model = toTemplateModel(dto as any)
    expect(model.fields[0].placeholder).toBeNull()
    expect(model.fields[0].helpText).toBeNull()
    expect(model.fields[0].canonicalKey).toBeNull()
  })
})

describe('toPaginatedTemplatesModel', () => {
  it('maps data array and pagination fields', () => {
    const paginated = toPaginatedTemplatesModel({
      data: [makeDto() as any],
      total: 1,
      page: 1,
      limit: 20,
    })
    expect(paginated.total).toBe(1)
    expect(paginated.page).toBe(1)
    expect(paginated.limit).toBe(20)
    expect(paginated.data).toHaveLength(1)
    expect(paginated.data[0].id).toBe('uuid-1')
  })
})
