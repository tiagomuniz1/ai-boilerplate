import { ExamRequestStatus } from '@app/shared'
import { toExamRequestModel } from './to-exam-request-model.mapper'

const makeDto = (overrides: object = {}) => ({
  id: 'exam-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Maria Santos',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. João',
  items: [
    { name: 'Hemograma completo', observations: 'Jejum de 8 horas' },
    { name: 'Raio-X de tórax', observations: null },
  ],
  notes: 'Retornar em 7 dias',
  status: ExamRequestStatus.REQUESTED,
  results: [],
  issuedAt: '2026-06-28T10:00:00.000Z',
  createdAt: '2026-06-28T10:00:00.000Z',
  ...overrides,
})

describe('toExamRequestModel', () => {
  it('maps all scalar fields correctly', () => {
    const model = toExamRequestModel(makeDto() as any)
    expect(model.id).toBe('exam-uuid')
    expect(model.appointmentId).toBe('appt-uuid')
    expect(model.patientName).toBe('Maria Santos')
    expect(model.professionalName).toBe('Dr. João')
    expect(model.status).toBe(ExamRequestStatus.REQUESTED)
    expect(model.notes).toBe('Retornar em 7 dias')
  })

  it('maps items preserving name and observations', () => {
    const model = toExamRequestModel(makeDto() as any)
    expect(model.items).toHaveLength(2)
    expect(model.items[0]).toEqual({ name: 'Hemograma completo', observations: 'Jejum de 8 horas' })
    expect(model.items[1]).toEqual({ name: 'Raio-X de tórax', observations: null })
  })

  it('preserves null notes', () => {
    const model = toExamRequestModel(makeDto({ notes: null }) as any)
    expect(model.notes).toBeNull()
  })

  it('converts issuedAt and createdAt strings to Date', () => {
    const model = toExamRequestModel(makeDto() as any)
    expect(model.issuedAt).toBeInstanceOf(Date)
    expect(model.issuedAt.toISOString()).toBe('2026-06-28T10:00:00.000Z')
    expect(model.createdAt).toBeInstanceOf(Date)
  })

  it('returns an empty results array when there are no results', () => {
    const model = toExamRequestModel(makeDto() as any)
    expect(model.results).toEqual([])
  })

  it('maps results including Date conversion', () => {
    const dto = makeDto({
      results: [
        {
          id: 'result-uuid',
          examRequestId: 'exam-uuid',
          fileName: 'hemograma.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 12345,
          createdAt: '2026-06-29T10:00:00.000Z',
        },
      ],
    })

    const model = toExamRequestModel(dto as any)

    expect(model.results).toHaveLength(1)
    expect(model.results[0].id).toBe('result-uuid')
    expect(model.results[0].fileName).toBe('hemograma.pdf')
    expect(model.results[0].mimeType).toBe('application/pdf')
    expect(model.results[0].fileSizeBytes).toBe(12345)
    expect(model.results[0].createdAt).toBeInstanceOf(Date)
  })
})
