jest.mock('../services/exams.service')

import { examsService } from '../services/exams.service'
import { deleteExamRequestUseCase } from './delete-exam-request.use-case'

const mockService = examsService as jest.Mocked<typeof examsService>

describe('deleteExamRequestUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls examsService.remove with the id', async () => {
    mockService.remove.mockResolvedValue(undefined)

    await deleteExamRequestUseCase('exam-uuid')

    expect(mockService.remove).toHaveBeenCalledWith('exam-uuid')
  })
})
