jest.mock('../services/exams.service')

import { examsService } from '../services/exams.service'
import { downloadExamResultFileUseCase } from './download-exam-result-file.use-case'

const mockService = examsService as jest.Mocked<typeof examsService>

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

describe('downloadExamResultFileUseCase', () => {
  let anchorElement: HTMLAnchorElement

  beforeEach(() => {
    jest.clearAllMocks()
    anchorElement = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement
    jest.spyOn(document, 'createElement').mockReturnValue(anchorElement)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('downloads the result file with the given filename', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockService.downloadResultFile.mockResolvedValue(blob)

    await downloadExamResultFileUseCase('result-uuid', 'hemograma.pdf')

    expect(mockService.downloadResultFile).toHaveBeenCalledWith('result-uuid')
    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
    expect(anchorElement.href).toBe(mockObjectUrl)
    expect(anchorElement.download).toBe('hemograma.pdf')
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockObjectUrl)
  })

  it('propagates service errors', async () => {
    mockService.downloadResultFile.mockRejectedValue({ status: 403 })
    await expect(downloadExamResultFileUseCase('result-uuid', 'hemograma.pdf')).rejects.toMatchObject({
      status: 403,
    })
    expect(mockCreateObjectURL).not.toHaveBeenCalled()
  })

  it('always calls revokeObjectURL after click', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockService.downloadResultFile.mockResolvedValue(blob)

    await downloadExamResultFileUseCase('result-uuid', 'hemograma.pdf')

    const createCallOrder = mockCreateObjectURL.mock.invocationCallOrder[0]
    const revokeCallOrder = mockRevokeObjectURL.mock.invocationCallOrder[0]
    const clickCallOrder = mockClick.mock.invocationCallOrder[0]
    expect(clickCallOrder).toBeLessThan(revokeCallOrder)
    expect(createCallOrder).toBeLessThan(revokeCallOrder)
  })
})
