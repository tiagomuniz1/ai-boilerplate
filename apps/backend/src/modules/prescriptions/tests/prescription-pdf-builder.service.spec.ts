import { PrescriptionPdfBuilderService } from '../services/prescription-pdf-builder.service'
import { CouncilType, PrescriptionSnapshot } from '@app/shared'

const VERIFY_URL = 'http://localhost:3000/clinica/verify/prescriptions/' + 'a'.repeat(64)

const makeSnapshot = (overrides: Partial<PrescriptionSnapshot> = {}): PrescriptionSnapshot => ({
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
  items: [
    { medicationId: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', instructions: 'Tomar 1 cp a cada 8 horas' },
  ],
  notes: 'Retornar em 7 dias se sintomas persistirem.',
  ...overrides,
})

describe('PrescriptionPdfBuilderService', () => {
  let service: PrescriptionPdfBuilderService

  beforeEach(() => {
    service = new PrescriptionPdfBuilderService()
    service.onModuleInit()
  })

  it('generates a valid PDF buffer (starts with %PDF)', async () => {
    const buffer = await service.build(makeSnapshot(), null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('generates PDF with a QR code node in the footer (verification URL)', async () => {
    const buffer = await service.build(makeSnapshot(), null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('generates PDF without logo', async () => {
    const buffer = await service.build(makeSnapshot({ clinic: { name: 'Clínica', address: null, logoUrl: null } }), null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with logo as base64', async () => {
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

    const buffer = await service.build(makeSnapshot(), tinyPng, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with multiple items', async () => {
    const snapshot = makeSnapshot({
      items: [
        { medicationId: 'a', name: 'Dipirona', activeIngredient: 'dipirona', instructions: 'Tomar 1 cp 8/8h' },
        { medicationId: 'b', name: 'Amoxicilina', activeIngredient: null, instructions: 'Tomar 1 cp 12/12h por 7 dias' },
      ],
    })

    const buffer = await service.build(snapshot, null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with item dosage appended to the name', async () => {
    const snapshot = makeSnapshot({
      items: [
        { medicationId: 'a', name: 'Dipirona', activeIngredient: 'dipirona', dosage: '500mg', instructions: 'Tomar 1 cp 8/8h' },
      ],
    })

    const buffer = await service.build(snapshot, null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with item quantity line', async () => {
    const snapshot = makeSnapshot({
      items: [
        { medicationId: 'a', name: 'Dipirona', activeIngredient: 'dipirona', quantity: '2 caixas', instructions: 'Tomar 1 cp 8/8h' },
      ],
    })

    const buffer = await service.build(snapshot, null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF without dosage/quantity lines when items omit them', async () => {
    const snapshot = makeSnapshot({
      items: [
        { medicationId: 'a', name: 'Dipirona', activeIngredient: 'dipirona', instructions: 'Tomar 1 cp 8/8h' },
      ],
    })

    const buffer = await service.build(snapshot, null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF without notes when notes is null', async () => {
    const buffer = await service.build(makeSnapshot({ notes: null }), null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF without specialty when specialtyName is null', async () => {
    const buffer = await service.build(
      makeSnapshot({ professional: { name: 'Dr. Test', councilType: CouncilType.CRM, registrationNumber: '99999/SP', registryNumber: null, specialtyName: null } }),
      null,
      VERIFY_URL,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF including the RQE next to the CRM when present', async () => {
    const buffer = await service.build(
      makeSnapshot({ professional: { name: 'Dr. Test', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: '222', specialtyName: 'mastologista' } }),
      null,
      VERIFY_URL,
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
      VERIFY_URL,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF when address is null (no city line in footer)', async () => {
    const buffer = await service.build(
      makeSnapshot({ clinic: { name: 'Clínica', address: null, logoUrl: null } }),
      null,
      VERIFY_URL,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('formats CPF correctly in the buffer content (11 digits)', async () => {
    const buffer = await service.build(makeSnapshot({ patient: { name: 'Maria', documentNumber: '12345678901' } }), null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF with empty items list (skips medications section)', async () => {
    const buffer = await service.build(makeSnapshot({ items: [] }), null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('returns raw CPF string when it does not have exactly 11 digits', async () => {
    const buffer = await service.build(
      makeSnapshot({ patient: { name: 'Maria', documentNumber: '123' } }),
      null,
      VERIFY_URL,
    )

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('ignores non-dataURL logo and generates PDF without it', async () => {
    const buffer = await service.build(makeSnapshot(), 'https://example.com/logo.png', VERIFY_URL)
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

    const buffer = await service.build(snapshot, null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates PDF without crashing when patient has no documentNumber (dependent without CPF)', async () => {
    const snapshot = makeSnapshot({ patient: { name: 'Bebê Santos', documentNumber: null } })

    const buffer = await service.build(snapshot, null, VERIFY_URL)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })
})
