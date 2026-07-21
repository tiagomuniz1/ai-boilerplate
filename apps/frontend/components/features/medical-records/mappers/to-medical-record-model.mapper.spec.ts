import { MedicalRecordFieldType } from '@app/shared'
import { toMedicalRecordModel, toPaginatedMedicalRecordsModel } from './to-medical-record-model.mapper'

const makeFieldDto = (overrides = {}) => ({
  key: 'field_k1',
  label: 'Sintoma',
  type: MedicalRecordFieldType.TEXT,
  required: true,
  order: 0,
  options: null,
  placeholder: null,
  helpText: null,
  canonical: false,
  canonicalKey: null,
  sectionKey: null,
  ...overrides,
})

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Ana Lima',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. João',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  templateId: 'tpl-uuid',
  templateSchemaSnapshot: [makeFieldDto()],
  data: { field_k1: 'Dor no peito' },
  notes: 'Observação',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

describe('toMedicalRecordModel', () => {
  it('maps scalar fields', () => {
    const model = toMedicalRecordModel(makeDto() as any)
    expect(model.id).toBe('uuid-1')
    expect(model.appointmentId).toBe('appt-uuid')
    expect(model.patientId).toBe('patient-uuid')
    expect(model.patientName).toBe('Ana Lima')
    expect(model.professionalId).toBe('doctor-uuid')
    expect(model.professionalName).toBe('Dr. João')
    expect(model.specialtyId).toBe('spec-uuid')
    expect(model.specialtyName).toBe('Cardiologia')
    expect(model.notes).toBe('Observação')
  })

  it('converts createdAt and updatedAt to Date', () => {
    const model = toMedicalRecordModel(makeDto() as any)
    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
  })

  it('maps templateSchemaSnapshot to schema', () => {
    const model = toMedicalRecordModel(makeDto() as any)
    expect(model.schema).toHaveLength(1)
    const f = model.schema[0]
    expect(f.key).toBe('field_k1')
    expect(f.label).toBe('Sintoma')
    expect(f.type).toBe(MedicalRecordFieldType.TEXT)
    expect(f.required).toBe(true)
    expect(f.order).toBe(0)
    expect(f.sectionKey).toBeNull()
  })

  it('maps sectionKey when present', () => {
    const dto = makeDto({
      templateSchemaSnapshot: [makeFieldDto({ sectionKey: 'sinais_vitais' })],
    })
    const model = toMedicalRecordModel(dto as any)
    expect(model.schema[0].sectionKey).toBe('sinais_vitais')
  })

  it('sorts schema by order ascending', () => {
    const dto = makeDto({
      templateSchemaSnapshot: [
        makeFieldDto({ key: 'k2', order: 2 }),
        makeFieldDto({ key: 'k0', order: 0 }),
        makeFieldDto({ key: 'k1', order: 1 }),
      ],
    })
    const model = toMedicalRecordModel(dto as any)
    expect(model.schema.map((f) => f.key)).toEqual(['k0', 'k1', 'k2'])
  })

  it('maps null options to null', () => {
    const model = toMedicalRecordModel(makeDto() as any)
    expect(model.schema[0].options).toBeNull()
  })

  it('maps options when present', () => {
    const dto = makeDto({
      templateSchemaSnapshot: [makeFieldDto({ type: MedicalRecordFieldType.SELECT, options: [{ value: 'low', label: 'Baixo' }] })],
    })
    const model = toMedicalRecordModel(dto as any)
    expect(model.schema[0].options).toEqual([{ value: 'low', label: 'Baixo' }])
  })

  it('maps undefined placeholder/helpText to null', () => {
    const model = toMedicalRecordModel(makeDto() as any)
    expect(model.schema[0].placeholder).toBeNull()
    expect(model.schema[0].helpText).toBeNull()
  })

  it('maps placeholder and helpText when present', () => {
    const dto = makeDto({
      templateSchemaSnapshot: [makeFieldDto({ placeholder: 'Informe', helpText: 'Dica' })],
    })
    const model = toMedicalRecordModel(dto as any)
    expect(model.schema[0].placeholder).toBe('Informe')
    expect(model.schema[0].helpText).toBe('Dica')
  })

  it('preserves data object', () => {
    const model = toMedicalRecordModel(makeDto() as any)
    expect(model.data).toEqual({ field_k1: 'Dor no peito' })
  })
})

describe('toPaginatedMedicalRecordsModel', () => {
  it('maps data array and pagination fields', () => {
    const paginated = toPaginatedMedicalRecordsModel({
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
