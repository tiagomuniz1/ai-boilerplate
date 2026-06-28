import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicationSource } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'
import { DeleteMedicationUseCase } from '../use-cases/delete-medication.use-case'

const mockRepository: jest.Mocked<IMedicationsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  bulkUpsert: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeMedication(): Medication {
  return {
    id: 'm1',
    name: 'Dipirona',
    activeIngredient: null,
    regulatoryCategory: null,
    therapeuticClass: null,
    holderCompany: null,
    registrationNumber: null,
    registrationStatus: null,
    source: MedicationSource.MANUAL,
    importHash: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  } as Medication
}

describe('DeleteMedicationUseCase', () => {
  let useCase: DeleteMedicationUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteMedicationUseCase({} as DataSource, mockRepository, mockCacheService)
  })

  it('throws NotFoundException when the medication does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException)
    expect(mockRepository.delete).not.toHaveBeenCalled()
  })

  it('soft deletes the medication and invalidates caches', async () => {
    mockRepository.findById.mockResolvedValue(makeMedication())

    await useCase.execute('m1')

    expect(mockRepository.delete).toHaveBeenCalledWith('m1')
    expect(mockCacheService.del).toHaveBeenCalledWith('medication:m1')
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('medications:list*')
  })

  it('still succeeds when cache invalidation fails', async () => {
    mockRepository.findById.mockResolvedValue(makeMedication())
    mockCacheService.delByPattern.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute('m1')).resolves.toBeUndefined()
    expect(mockRepository.delete).toHaveBeenCalledWith('m1')
  })
})
