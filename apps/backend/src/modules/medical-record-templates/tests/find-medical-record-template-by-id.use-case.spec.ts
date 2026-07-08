import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { FindMedicalRecordTemplateByIdUseCase } from '../use-cases/find-medical-record-template-by-id.use-case'

const mockTemplatesRepository: jest.Mocked<IMedicalRecordTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockSpecialtiesRepository = {
  findById: jest.fn(),
} as unknown as jest.Mocked<ISpecialtiesRepository>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.DOCTOR, clinicId }

const makeTemplate = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId,
  specialtyId: 'spec-1',
  name: 'Template',
  fields: [],
  isActive: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('FindMedicalRecordTemplateByIdUseCase', () => {
  let useCase: FindMedicalRecordTemplateByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindMedicalRecordTemplateByIdUseCase(
      {} as DataSource,
      mockTemplatesRepository,
      mockSpecialtiesRepository,
      mockCacheService,
    )
  })

  it('returns cached response when cache hits', async () => {
    const cached = { id: 'tpl-1' }
    mockCacheService.get.mockResolvedValue(cached as any)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(result).toBe(cached as any)
    expect(mockTemplatesRepository.findById).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when not found (or from another clinic)', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockTemplatesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('tpl-1', currentUser)).rejects.toThrow(NotFoundException)
    expect(mockTemplatesRepository.findById).toHaveBeenCalledWith('tpl-1', clinicId)
  })

  it('resolves specialty name, caches and returns the response', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockSpecialtiesRepository.findById.mockResolvedValue({ id: 'spec-1', name: 'Cardiologia' } as any)

    const result = await useCase.execute(template.id, currentUser)

    expect(result.specialtyName).toBe('Cardiologia')
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `medical_record_template:${clinicId}:${template.id}`,
      result,
      300,
    )
  })

  it('returns null specialtyName when specialty is missing', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockTemplatesRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(null)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(result.specialtyName).toBeNull()
  })

  it('skips the specialty lookup for a generalist template (null specialtyId)', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockTemplatesRepository.findById.mockResolvedValue(makeTemplate({ specialtyId: null }) as any)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(mockSpecialtiesRepository.findById).not.toHaveBeenCalled()
    expect(result.specialtyId).toBeNull()
    expect(result.specialtyName).toBeNull()
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockTemplatesRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockSpecialtiesRepository.findById.mockResolvedValue({ name: 'Cardiologia' } as any)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(result.specialtyName).toBe('Cardiologia')
  })

  it('continues when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))
    mockTemplatesRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockSpecialtiesRepository.findById.mockResolvedValue({ name: 'Cardiologia' } as any)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(result.id).toBeDefined()
  })
})
