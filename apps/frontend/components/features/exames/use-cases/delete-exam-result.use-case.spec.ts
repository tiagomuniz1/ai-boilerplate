jest.mock('../services/exams.service')

import { examsService } from '../services/exams.service'
import { deleteExamResultUseCase } from './delete-exam-result.use-case'

const mockService = examsService as jest.Mocked<typeof examsService>

describe('deleteExamResultUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls examsService.removeResult with the id', async () => {
    mockService.removeResult.mockResolvedValue(undefined)

    await deleteExamResultUseCase('result-uuid')

    expect(mockService.removeResult).toHaveBeenCalledWith('result-uuid')
  })
})
