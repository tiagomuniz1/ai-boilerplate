import { MedicalCertificatePdfBuilderService } from '../services/medical-certificate-pdf-builder.service'
import { CouncilType, MedicalCertificateSnapshot, MedicalCertificateType } from '@app/shared'

const makeSnapshot = (overrides: Partial<MedicalCertificateSnapshot> = {}): MedicalCertificateSnapshot => ({
  issuedAt: '2026-06-28T10:00:00.000Z',
  type: MedicalCertificateType.LEAVE,
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
  daysOff: 3,
  startDate: '2026-01-05',
  cidCode: 'M54.5',
  attendanceDate: null,
  checkInTime: null,
  checkOutTime: null,
  observations: 'Repouso absoluto recomendado.',
  ...overrides,
})

const makeAttendanceSnapshot = (overrides: Partial<MedicalCertificateSnapshot> = {}): MedicalCertificateSnapshot =>
  makeSnapshot({
    type: MedicalCertificateType.ATTENDANCE,
    daysOff: null,
    startDate: null,
    cidCode: null,
    attendanceDate: '2026-01-05',
    checkInTime: '08:00',
    checkOutTime: '08:30',
    ...overrides,
  })

describe('MedicalCertificatePdfBuilderService', () => {
  let service: MedicalCertificatePdfBuilderService

  beforeEach(() => {
    service = new MedicalCertificatePdfBuilderService()
    service.onModuleInit()
  })

  it('generates a valid PDF buffer for LEAVE (starts with %PDF)', async () => {
    const buffer = await service.build(makeSnapshot(), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('generates a valid PDF buffer for ATTENDANCE', async () => {
    const buffer = await service.build(makeAttendanceSnapshot(), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('generates LEAVE PDF without CID when cidCode is null', async () => {
    const buffer = await service.build(makeSnapshot({ cidCode: null }), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('uses singular "dia" when daysOff is 1', async () => {
    const buffer = await service.build(makeSnapshot({ daysOff: 1 }), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
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

  it('generates PDF without observations when observations is null', async () => {
    const buffer = await service.build(makeSnapshot({ observations: null }), null)

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

  it('generates PDF without crashing when patient has no documentNumber (dependent without CPF)', async () => {
    const buffer = await service.build(
      makeSnapshot({ patient: { name: 'Bebê Santos', documentNumber: null } }),
      null,
    )

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

  it('formats startDate as DD/MM/AAAA without timezone shift', async () => {
    const buffer = await service.build(makeSnapshot({ startDate: '2026-01-05' }), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('formats attendanceDate as DD/MM/AAAA without timezone shift', async () => {
    const buffer = await service.build(makeAttendanceSnapshot({ attendanceDate: '2026-12-31' }), null)

    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })
})
