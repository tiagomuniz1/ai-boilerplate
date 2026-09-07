jest.mock('../services/vaccine-indications.service')

import { vaccineIndicationsService } from '../services/vaccine-indications.service'
import { listVaccineIndicationsUseCase } from './list-vaccine-indications.use-case'
import { createVaccineIndicationUseCase } from './create-vaccine-indication.use-case'
import { deleteVaccineIndicationUseCase } from './delete-vaccine-indication.use-case'
import { downloadVaccineIndicationPdfUseCase } from './download-vaccine-indication-pdf.use-case'

const mockService = vaccineIndicationsService as jest.Mocked<typeof vaccineIndicationsService>

const makeDto = (overrides = {}) => ({
  id: 'indication-uuid',
  appointmentId: 'appointment-uuid',
  patientId: 'patient-uuid',
  patientName: 'Clara Monteiro Alves',
  professionalId: 'professional-uuid',
  professionalName: 'Dra. Helena Vasconcelos',
  issuedAt: '2026-09-04T10:00:00.000Z',
  items: [{ vaccineId: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: null }],
  notes: null,
  createdAt: '2026-09-04T10:00:00.000Z',
  ...overrides,
})

describe('listVaccineIndicationsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('mapeia cada DTO para o modelo', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)
    const result = await listVaccineIndicationsUseCase('appointment-uuid')
    expect(mockService.getByAppointment).toHaveBeenCalledWith('appointment-uuid')
    expect(result[0].issuedAt).toBeInstanceOf(Date)
    expect(result[0].items[0].name).toBe('Tríplice viral')
  })

  it('devolve lista vazia quando não há indicações', async () => {
    mockService.getByAppointment.mockResolvedValue([] as any)
    expect(await listVaccineIndicationsUseCase('appointment-uuid')).toEqual([])
  })
})

describe('createVaccineIndicationUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('converte a entrada para DTO e devolve o modelo', async () => {
    mockService.create.mockResolvedValue(makeDto() as any)

    const result = await createVaccineIndicationUseCase({
      appointmentId: 'appointment-uuid',
      items: [{ vaccineId: 'v1', doseLabel: '  1ª dose  ' }],
    })

    expect(mockService.create).toHaveBeenCalledWith({
      appointmentId: 'appointment-uuid',
      items: [{ vaccineId: 'v1', doseLabel: '1ª dose' }],
    })
    expect(result.id).toBe('indication-uuid')
  })
})

describe('deleteVaccineIndicationUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('delega ao service', async () => {
    mockService.remove.mockResolvedValue(undefined)
    await deleteVaccineIndicationUseCase('indication-uuid')
    expect(mockService.remove).toHaveBeenCalledWith('indication-uuid')
  })
})

describe('downloadVaccineIndicationPdfUseCase', () => {
  const mockObjectUrl = 'blob:mock-url'
  const mockCreateObjectURL = jest.fn(() => mockObjectUrl)
  const mockRevokeObjectURL = jest.fn()
  const mockClick = jest.fn()
  let anchorElement: HTMLAnchorElement

  beforeAll(() => {
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
      writable: true,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    anchorElement = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement
    jest.spyOn(document, 'createElement').mockReturnValue(anchorElement)
  })

  afterEach(() => jest.restoreAllMocks())

  it('baixa com nome padrão e libera a URL do blob', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockService.downloadPdf.mockResolvedValue(blob)

    await downloadVaccineIndicationPdfUseCase('indication-uuid')

    expect(anchorElement.download).toBe('indicacao-vacina-indication-uuid.pdf')
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockObjectUrl)
  })

  it('respeita o nome de arquivo informado', async () => {
    mockService.downloadPdf.mockResolvedValue(new Blob(['%PDF']))
    await downloadVaccineIndicationPdfUseCase('indication-uuid', 'custom.pdf')
    expect(anchorElement.download).toBe('custom.pdf')
  })
})
