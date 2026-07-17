import { QueryRunner, Repository } from 'typeorm'
import { AccessRequest } from '../entities/access-request.entity'
import { AccessRequestsRepository } from '../repositories/access-requests.repository'
import { CreateAccessRequestData } from '../repositories/access-requests.repository.interface'

function makeRepo(): jest.Mocked<Repository<AccessRequest>> {
  return {
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Repository<AccessRequest>>
}

function makeData(): CreateAccessRequestData {
  return { fullName: 'Ana Costa', email: 'ana@clinica.com', clinicName: 'Clínica do Vale' }
}

describe('AccessRequestsRepository', () => {
  let mockRepo: jest.Mocked<Repository<AccessRequest>>
  let repository: AccessRequestsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo = makeRepo()
    repository = new AccessRequestsRepository(mockRepo)
  })

  describe('create', () => {
    it('creates and saves an access request', async () => {
      const data = makeData()
      const entity = { id: 'uuid-1', ...data } as AccessRequest
      mockRepo.create.mockReturnValue(entity)
      mockRepo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(mockRepo.create).toHaveBeenCalledWith(data)
      expect(mockRepo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner when provided', async () => {
      const data = makeData()
      const entity = { id: 'uuid-1', ...data } as AccessRequest
      const mockQrRepo = { create: jest.fn().mockReturnValue(entity), save: jest.fn().mockResolvedValue(entity) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(AccessRequest)
      expect(mockQrRepo.create).toHaveBeenCalledWith(data)
      expect(mockQrRepo.save).toHaveBeenCalledWith(entity)
    })
  })
})
