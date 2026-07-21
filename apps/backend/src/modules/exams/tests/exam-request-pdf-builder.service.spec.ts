import { ExamRequestPdfBuilderService } from '../services/exam-request-pdf-builder.service'
import { CouncilType, ExamRequestSnapshot } from '@app/shared'

const makeSnapshot = (overrides: Partial<ExamRequestSnapshot> = {}): ExamRequestSnapshot => ({
  issuedAt: '2026-06-28T10:00:00.000Z',
  clinic: {
    name: 'Clínica Saúde',
    address: {
      street: 'Rua das Flores',
      number: '100',
      complement: 'Sala 2',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01001000',
    },
    logoUrl: null,
  },
  professional: { name: 'Dr. João Silva', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: 'Clínica Geral' },
  patient: { name: 'Maria Santos', documentNumber: '12345678901' },
  items: [{ name: 'Hemograma completo', observations: 'Jejum de 8 horas' }],
  notes: 'Retornar com resultado em até 7 dias.',
  ...overrides,
})

describe('ExamRequestPdfBuilderService', () => {
  let service: ExamRequestPdfBuilderService

  beforeEach(() => {
    service = new ExamRequestPdfBuilderService()
    service.onModuleInit()
  })

  it('generates a valid PDF buffer (starts with %PDF)', async () => {
    const buffer = await service.build(makeSnapshot(), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('generates PDF without logo', async () => {
    const buffer = await service.build(makeSnapshot({ clinic: { name: 'Clínica', address: null, logoUrl: null } }), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with logo as base64', async () => {
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

    const buffer = await service.build(makeSnapshot(), tinyPng)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with a single item without observations', async () => {
    const snapshot = makeSnapshot({ items: [{ name: 'Hemograma completo', observations: null }] })

    const buffer = await service.build(snapshot, null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with multiple items, some with observations', async () => {
    const snapshot = makeSnapshot({
      items: [
        { name: 'Hemograma completo', observations: 'Jejum de 8 horas' },
        { name: 'Glicemia em jejum', observations: null },
        { name: 'Raio-X de tórax', observations: 'Incidência PA e perfil' },
      ],
    })

    const buffer = await service.build(snapshot, null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF without notes section when notes is null', async () => {
    const buffer = await service.build(makeSnapshot({ notes: null }), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF without specialty when specialtyName is null', async () => {
    const buffer = await service.build(
      makeSnapshot({ professional: { name: 'Dr. Test', councilType: CouncilType.CRM, registrationNumber: '99999/SP', registryNumber: null, specialtyName: null } }),
      null,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF including the RQE next to the CRM when present', async () => {
    const buffer = await service.build(
      makeSnapshot({ professional: { name: 'Dr. Test', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: '222', specialtyName: 'mastologista' } }),
      null,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF for a professional with a non-CRM council type (no RQE segment)', async () => {
    const buffer = await service.build(
      makeSnapshot({
        professional: {
          name: 'Ana Nutricionista',
          councilType: CouncilType.CRN,
          registrationNumber: '9876543/SP',
          registryNumber: null,
          specialtyName: null,
        },
      }),
      null,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF when address is null (no city line in footer)', async () => {
    const buffer = await service.build(
      makeSnapshot({ clinic: { name: 'Clínica', address: null, logoUrl: null } }),
      null,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('formats CPF correctly in the buffer content (11 digits)', async () => {
    const buffer = await service.build(makeSnapshot({ patient: { name: 'Maria', documentNumber: '12345678901' } }), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('returns raw CPF string when it does not have exactly 11 digits', async () => {
    const buffer = await service.build(
      makeSnapshot({ patient: { name: 'Maria', documentNumber: '123' } }),
      null,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with empty items list (skips items section)', async () => {
    const buffer = await service.build(makeSnapshot({ items: [] }), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('ignores non-dataURL logo and generates PDF without it', async () => {
    const buffer = await service.build(makeSnapshot(), 'https://example.com/logo.png')
    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('does not crash with partially null address fields', async () => {
    const snapshot = makeSnapshot({
      clinic: {
        name: 'Clínica Teste',
        address: { street: 'Rua X', number: null, complement: null, neighborhood: null, city: 'Rio de Janeiro', state: 'RJ', zipCode: null },
        logoUrl: null,
      },
    })

    const buffer = await service.build(snapshot, null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })
})
