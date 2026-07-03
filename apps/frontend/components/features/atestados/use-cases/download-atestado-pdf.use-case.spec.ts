jest.mock('../services/atestados.service')

import { atestadosService } from '../services/atestados.service'
import { downloadAtestadoPdfUseCase } from './download-atestado-pdf.use-case'

const mockService = atestadosService as jest.Mocked<typeof atestadosService>

const mockObjectUrl = 'blob:mock-url'
const mockCreateObjectURL = jest.fn(() => mockObjectUrl)
const mockRevokeObjectURL = jest.fn()
const mockClick = jest.fn()

beforeAll(() => {
  Object.defineProperty(globalThis, 'URL', {
    value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
    writable: true,
  })
})

describe('downloadAtestadoPdfUseCase', () => {
  let anchorElement: HTMLAnchorElement

  beforeEach(() => {
    jest.clearAllMocks()
    anchorElement = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement
    jest.spyOn(document, 'createElement').mockReturnValue(anchorElement)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('downloads PDF with default filename', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockService.downloadPdf.mockResolvedValue(blob)

    await downloadAtestadoPdfUseCase('cert-uuid')

    expect(mockService.downloadPdf).toHaveBeenCalledWith('cert-uuid')
    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
    expect(anchorElement.href).toBe(mockObjectUrl)
    expect(anchorElement.download).toBe('atestado-cert-uuid.pdf')
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockObjectUrl)
  })

  it('downloads PDF with custom filename', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockService.downloadPdf.mockResolvedValue(blob)

    await downloadAtestadoPdfUseCase('cert-uuid', 'my-atestado.pdf')

    expect(anchorElement.download).toBe('my-atestado.pdf')
  })

  it('propagates service errors', async () => {
    mockService.downloadPdf.mockRejectedValue({ status: 403 })
    await expect(downloadAtestadoPdfUseCase('cert-uuid')).rejects.toMatchObject({ status: 403 })
    expect(mockCreateObjectURL).not.toHaveBeenCalled()
  })

  it('always calls revokeObjectURL after click', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockService.downloadPdf.mockResolvedValue(blob)

    await downloadAtestadoPdfUseCase('cert-uuid')

    const createCallOrder = mockCreateObjectURL.mock.invocationCallOrder[0]
    const revokeCallOrder = mockRevokeObjectURL.mock.invocationCallOrder[0]
    const clickCallOrder = mockClick.mock.invocationCallOrder[0]
    expect(clickCallOrder).toBeLessThan(revokeCallOrder)
    expect(createCallOrder).toBeLessThan(revokeCallOrder)
  })
})
