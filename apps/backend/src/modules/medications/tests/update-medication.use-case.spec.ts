import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicationSource } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'
import { UpdateMedicationUseCase } from '../use-cases/update-medication.use-case'

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

function makeMedication(overrides = {}): Medication {
  return {
    id: 'm1',
    name: 'Dipirona',
    activeIngredient: 'dipirona sódica',
    regulatoryCategory: 'Genérico',
    therapeuticClass: 'ANALGESICOS',
    holderCompany: 'ACME',
    registrationNumber: '123',
    registrationStatus: 'Ativo',
    source: MedicationSource.ANVISA,
    importHash: 'hash',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  } as Medication
}

describe('UpdateMedicationUseCase', () => {
  let useCase: UpdateMedicationUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateMedicationUseCase({} as DataSource, mockRepository, mockCacheService)
  })

  it('throws NotFoundException when the medication does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('missing', { name: 'X' })).rejects.toThrow(NotFoundException)
    expect(mockRepository.update).not.toHaveBeenCalled()
  })

  it('updates and returns the mapped response', async () => {
    mockRepository.findById.mockResolvedValue(makeMedication())
    mockRepository.update.mockResolvedValue(makeMedication({ isActive: false }))

    const result = await useCase.execute('m1', { isActive: false })

    expect(mockRepository.update).toHaveBeenCalledWith('m1', { isActive: false })
    expect(result.isActive).toBe(false)
    expect(result).not.toHaveProperty('importHash')
  })

  it('invalidates the individual and list caches', async () => {
    mockRepository.findById.mockResolvedValue(makeMedication())
    mockRepository.update.mockResolvedValue(makeMedication())

    await useCase.execute('m1', { name: 'Novo' })

    expect(mockCacheService.del).toHaveBeenCalledWith('medication:m1')
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('medications:list*')
  })

  it('still succeeds when cache invalidation fails', async () => {
    mockRepository.findById.mockResolvedValue(makeMedication())
    mockRepository.update.mockResolvedValue(makeMedication())
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    const result = await useCase.execute('m1', { name: 'Novo' })

    expect(result.id).toBe('m1')
  })
})
