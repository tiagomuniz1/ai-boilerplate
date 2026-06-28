import { DataSource } from 'typeorm'
import { MedicationSource, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { MedicationListQueryDto } from '../dto/medication-list-query.dto'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'
import { FindMedicationsUseCase } from '../use-cases/find-medications.use-case'

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

function makeQuery(overrides: Partial<MedicationListQueryDto> = {}): MedicationListQueryDto {
  return Object.assign(new MedicationListQueryDto(), { page: 1, limit: 20, ...overrides })
}

const platformAdmin: ICurrentUser = { id: 'p1', role: UserRole.PLATFORM_ADMIN, clinicId: null }
const admin: ICurrentUser = { id: 'a1', role: UserRole.ADMIN, clinicId: 'c1' }

describe('FindMedicationsUseCase', () => {
  let useCase: FindMedicationsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindMedicationsUseCase({} as DataSource, mockRepository, mockCacheService)
  })

  it('returns the cached payload when present', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(makeQuery(), admin)

    expect(result).toBe(cached)
    expect(mockRepository.findAll).not.toHaveBeenCalled()
  })

  it('maps entities to the paginated response and caches it', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockRepository.findAll.mockResolvedValue([[makeMedication()], 1])

    const result = await useCase.execute(makeQuery({ search: 'dipi' }), admin)

    expect(mockRepository.findAll).toHaveBeenCalledWith(1, 20, 'dipi', false)
    expect(result).toEqual({
      data: [
        {
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
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
    expect(mockCacheService.set).toHaveBeenCalledWith(
      'medications:list:1:20:dipi:false',
      result,
      60,
    )
  })

  it('honors includeInactive only for PLATFORM_ADMIN', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute(makeQuery({ includeInactive: true }), platformAdmin)

    expect(mockRepository.findAll).toHaveBeenCalledWith(1, 20, undefined, true)
  })

  it('ignores includeInactive for non platform admins', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute(makeQuery({ includeInactive: true }), admin)

    expect(mockRepository.findAll).toHaveBeenCalledWith(1, 20, undefined, false)
  })

  it('still resolves when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('redis down'))
    mockRepository.findAll.mockResolvedValue([[], 0])

    const result = await useCase.execute(makeQuery(), admin)

    expect(result.total).toBe(0)
  })

  it('still resolves when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockRejectedValue(new Error('redis down'))
    mockRepository.findAll.mockResolvedValue([[], 0])

    const result = await useCase.execute(makeQuery(), admin)

    expect(result.total).toBe(0)
  })
})
