import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { DeleteMedicalRecordTemplateUseCase } from '../use-cases/delete-medical-record-template.use-case'

const mockTemplatesRepository: jest.Mocked<IMedicalRecordTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  del: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }

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

describe('DeleteMedicalRecordTemplateUseCase', () => {
  let useCase: DeleteMedicalRecordTemplateUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteMedicalRecordTemplateUseCase(
      {} as DataSource,
      mockTemplatesRepository,
      mockCacheService,
    )
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('throws NotFoundException when template does not exist', async () => {
    mockTemplatesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('missing', currentUser)).rejects.toThrow(NotFoundException)
    expect(mockTemplatesRepository.delete).not.toHaveBeenCalled()
  })

  it('soft deletes and invalidates caches', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)

    await useCase.execute(template.id, currentUser)

    expect(mockTemplatesRepository.delete).toHaveBeenCalledWith(template.id, clinicId)
    expect(mockCacheService.del).toHaveBeenCalledWith(
      `medical_record_template:${clinicId}:${template.id}`,
    )
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}*`,
    )
  })

  it('continues when cache invalidation fails', async () => {
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(template.id, currentUser)).resolves.toBeUndefined()
    expect(mockTemplatesRepository.delete).toHaveBeenCalled()
  })
})
