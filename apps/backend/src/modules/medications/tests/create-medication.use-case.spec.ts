import { DataSource } from 'typeorm'
import { CreateMedicationDto, MedicationSource } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'
import { CreateMedicationUseCase } from '../use-cases/create-medication.use-case'

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
    ...overrides,
  } as Medication
}

describe('CreateMedicationUseCase', () => {
  let useCase: CreateMedicationUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateMedicationUseCase({} as DataSource, mockRepository, mockCacheService)
  })

  it('creates a MANUAL medication with null import hash and defaults', async () => {
    const dto: CreateMedicationDto = { name: 'Dipirona' }
    mockRepository.create.mockResolvedValue(makeMedication())

    const result = await useCase.execute(dto)

    expect(mockRepository.create).toHaveBeenCalledWith({
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
    })
    expect(result).toEqual({
      id: 'm1',
      name: 'Dipirona',
      activeIngredient: null,
      regulatoryCategory: null,
      therapeuticClass: null,
      holderCompany: null,
      registrationNumber: null,
      registrationStatus: null,
      source: MedicationSource.MANUAL,
      isActive: true,
      createdAt: new Date('2024-01-01'),
    })
  })

  it('passes through provided optional fields', async () => {
    const dto: CreateMedicationDto = {
      name: 'Amoxicilina',
      activeIngredient: 'amoxicilina',
      therapeuticClass: 'ANTIBIOTICOS',
    }
    mockRepository.create.mockResolvedValue(makeMedication())

    await useCase.execute(dto)

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Amoxicilina',
        activeIngredient: 'amoxicilina',
        therapeuticClass: 'ANTIBIOTICOS',
        source: MedicationSource.MANUAL,
      }),
    )
  })

  it('invalidates the list cache after creation', async () => {
    mockRepository.create.mockResolvedValue(makeMedication())

    await useCase.execute({ name: 'Dipirona' })

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('medications:list*')
  })

  it('still succeeds when cache invalidation fails', async () => {
    mockRepository.create.mockResolvedValue(makeMedication())
    mockCacheService.delByPattern.mockRejectedValue(new Error('redis down'))

    const result = await useCase.execute({ name: 'Dipirona' })

    expect(result.id).toBe('m1')
  })
})
