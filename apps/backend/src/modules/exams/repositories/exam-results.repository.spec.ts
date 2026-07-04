import { QueryRunner, Repository } from 'typeorm'
import { ExamResult } from '../entities/exam-result.entity'
import { ExamResultsRepository } from './exam-results.repository'
import { CreateExamResultData } from './exam-results.repository.interface'

function makeRepo(): jest.Mocked<Repository<ExamResult>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<ExamResult>>
}

function makeExamResultData(): CreateExamResultData {
  return {
    id: 'result-uuid',
    clinicId: 'clinic-uuid',
    examRequestId: 'exam-uuid',
    filePath: 'exam-results/clinic-uuid/exam-uuid/result-uuid.pdf',
    fileName: 'hemograma.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 12345,
    uploadedByUserId: 'user-uuid',
  }
}

describe('ExamResultsRepository', () => {
  let mockRepo: jest.Mocked<Repository<ExamResult>>
  let repository: ExamResultsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo = makeRepo()
    repository = new ExamResultsRepository(mockRepo)
  })

  describe('findByExamRequestIds', () => {
    it('returns an empty array without querying when examRequestIds is empty', async () => {
      const result = await repository.findByExamRequestIds([], 'clinic-uuid')

      expect(result).toEqual([])
      expect(mockRepo.find).not.toHaveBeenCalled()
    })

    it('queries by examRequestId IN (...) and clinicId ordered by createdAt ASC', async () => {
      mockRepo.find.mockResolvedValue([])
      await repository.findByExamRequestIds(['exam-1', 'exam-2'], 'clinic-uuid')

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { examRequestId: expect.anything(), clinicId: 'clinic-uuid' },
        order: { createdAt: 'ASC' },
      })
    })
  })

  describe('findById', () => {
    it('queries by id and clinicId', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await repository.findById('result-uuid', 'clinic-uuid')
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'result-uuid', clinicId: 'clinic-uuid' } })
    })

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await repository.findById('result-uuid', 'clinic-uuid')
      expect(result).toBeNull()
    })

    it('returns the exam result when found', async () => {
      const examResult = { id: 'result-uuid' } as ExamResult
      mockRepo.findOne.mockResolvedValue(examResult)
      const result = await repository.findById('result-uuid', 'clinic-uuid')
      expect(result).toBe(examResult)
    })
  })

  describe('countActiveByExamRequest', () => {
    it('counts by examRequestId', async () => {
      mockRepo.count.mockResolvedValue(2)
      const result = await repository.countActiveByExamRequest('exam-uuid')
      expect(mockRepo.count).toHaveBeenCalledWith({ where: { examRequestId: 'exam-uuid' } })
      expect(result).toBe(2)
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { count: jest.fn().mockResolvedValue(0) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      const result = await repository.countActiveByExamRequest('exam-uuid', queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ExamResult)
      expect(mockQrRepo.count).toHaveBeenCalledWith({ where: { examRequestId: 'exam-uuid' } })
      expect(result).toBe(0)
    })
  })

  describe('create', () => {
    it('creates and saves an exam result', async () => {
      const data = makeExamResultData()
      const entity = { id: 'result-uuid' } as ExamResult
      mockRepo.create.mockReturnValue(entity)
      mockRepo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(mockRepo.create).toHaveBeenCalledWith(data)
      expect(mockRepo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner when provided', async () => {
      const data = makeExamResultData()
      const entity = { id: 'result-uuid' } as ExamResult
      const mockQrRepo = { create: jest.fn().mockReturnValue(entity), save: jest.fn().mockResolvedValue(entity) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ExamResult)
      expect(mockQrRepo.create).toHaveBeenCalledWith(data)
      expect(mockQrRepo.save).toHaveBeenCalledWith(entity)
    })
  })

  describe('deleteByExamRequestId', () => {
    it('soft-deletes all results for the exam request', async () => {
      mockRepo.softDelete.mockResolvedValue(undefined as any)
      await repository.deleteByExamRequestId('exam-uuid')
      expect(mockRepo.softDelete).toHaveBeenCalledWith({ examRequestId: 'exam-uuid' })
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.deleteByExamRequestId('exam-uuid', queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ExamResult)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith({ examRequestId: 'exam-uuid' })
    })
  })

  describe('delete', () => {
    it('soft-deletes by id', async () => {
      mockRepo.softDelete.mockResolvedValue(undefined as any)
      await repository.delete('result-uuid')
      expect(mockRepo.softDelete).toHaveBeenCalledWith('result-uuid')
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.delete('result-uuid', queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ExamResult)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith('result-uuid')
    })
  })
})
