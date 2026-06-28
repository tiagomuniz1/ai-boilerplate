import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicationSource } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'
import { GetMedicationUseCase } from '../use-cases/get-medication.use-case'

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

describe('GetMedicationUseCase', () => {
  let useCase: GetMedicationUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetMedicationUseCase({} as DataSource, mockRepository, mockCacheService)
  })

  it('returns the cached response when present', async () => {
    const cached = { id: 'm1' }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute('m1')

    expect(result).toBe(cached)
    expect(mockRepository.findById).not.toHaveBeenCalled()
  })

  it('loads, maps and caches the medication on cache miss', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockRepository.findById.mockResolvedValue(makeMedication())

    const result = await useCase.execute('m1')

    expect(result).toEqual({
      id: 'm1',
      name: 'Dipirona',
      activeIngredient: 'dipirona sódica',
      regulatoryCategory: 'Genérico',
      therapeuticClass: 'ANALGESICOS',
      holderCompany: 'ACME',
      registrationNumber: '123',
      registrationStatus: 'Ativo',
      source: MedicationSource.ANVISA,
      isActive: true,
      createdAt: new Date('2024-01-01'),
    })
    expect(mockCacheService.set).toHaveBeenCalledWith('medication:m1', result, 300)
  })

  it('throws NotFoundException when the medication does not exist', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException)
  })

  it('still resolves when the cache layer fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('redis down'))
    mockCacheService.set.mockRejectedValue(new Error('redis down'))
    mockRepository.findById.mockResolvedValue(makeMedication())

    const result = await useCase.execute('m1')

    expect(result.id).toBe('m1')
  })
})
