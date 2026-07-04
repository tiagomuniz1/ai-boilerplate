import { UserRole } from '@app/shared'
import { ExamResultsController } from './exam-results.controller'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { DeleteExamResultUseCase } from '../use-cases/delete-exam-result.use-case'
import { DownloadExamResultFileUseCase } from '../use-cases/download-exam-result-file.use-case'

const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteExamResultUseCase>
const mockDownloadFile = { execute: jest.fn() } as unknown as jest.Mocked<DownloadExamResultFileUseCase>

const currentUser: ICurrentUser = { id: 'doctor-uuid', role: UserRole.DOCTOR, clinicId: 'clinic-uuid' }

function makeResponse() {
  return {
    set: jest.fn(),
    end: jest.fn(),
  } as unknown as import('express').Response
}

describe('ExamResultsController', () => {
  let controller: ExamResultsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ExamResultsController(mockDelete, mockDownloadFile)
  })

  it('delete delegates to DeleteExamResultUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('result-uuid', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('result-uuid', currentUser)
  })

  it('downloadFile delegates to DownloadExamResultFileUseCase and streams the buffer', async () => {
    mockDownloadFile.execute.mockResolvedValue({
      buffer: Buffer.from('file-bytes'),
      fileName: 'hemograma.pdf',
      mimeType: 'application/pdf',
    })
    const res = makeResponse()

    await controller.downloadFile('result-uuid', currentUser, res)

    expect(mockDownloadFile.execute).toHaveBeenCalledWith('result-uuid', currentUser)
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="hemograma.pdf"',
      'Content-Length': 10,
    })
    expect(res.end).toHaveBeenCalledWith(Buffer.from('file-bytes'))
  })
})
