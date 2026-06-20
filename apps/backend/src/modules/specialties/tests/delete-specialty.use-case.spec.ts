import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { DeleteSpecialtyUseCase } from '../use-cases/delete-specialty.use-case'

const mockSpecialtiesRepository: jest.Mocked<ISpecialtiesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByName: jest.fn(),
  countLinkedDoctors: jest.fn(),
  countLinkedClinics: jest.fn(),
  countLinkedAppointments: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeSpecialty = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: 'Cardiologia',
  description: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('DeleteSpecialtyUseCase', () => {
  let useCase: DeleteSpecialtyUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteSpecialtyUseCase(
      {} as DataSource,
      mockSpecialtiesRepository,
      mockCacheService,
    )
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
    mockSpecialtiesRepository.countLinkedDoctors.mockResolvedValue(0)
    mockSpecialtiesRepository.countLinkedClinics.mockResolvedValue(0)
    mockSpecialtiesRepository.countLinkedAppointments.mockResolvedValue(0)
  })

  it('deletes specialty when no doctors are linked', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.delete.mockResolvedValue(undefined)

    await expect(useCase.execute(specialty.id)).resolves.toBeUndefined()

    expect(mockSpecialtiesRepository.delete).toHaveBeenCalledWith(specialty.id)
  })

  it('throws ConflictException when specialty is linked to one doctor', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.countLinkedDoctors.mockResolvedValue(1)

    await expect(useCase.execute(specialty.id)).rejects.toThrow(ConflictException)
    expect(mockSpecialtiesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ConflictException when specialty is linked to multiple doctors', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.countLinkedDoctors.mockResolvedValue(3)

    await expect(useCase.execute(specialty.id)).rejects.toThrow(ConflictException)
    expect(mockSpecialtiesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ConflictException when specialty is linked to a clinic', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.countLinkedClinics.mockResolvedValue(2)

    await expect(useCase.execute(specialty.id)).rejects.toThrow(ConflictException)
    expect(mockSpecialtiesRepository.countLinkedAppointments).not.toHaveBeenCalled()
    expect(mockSpecialtiesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ConflictException when specialty has appointments attached', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.countLinkedAppointments.mockResolvedValue(1)

    await expect(useCase.execute(specialty.id)).rejects.toThrow(ConflictException)
    expect(mockSpecialtiesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when specialty does not exist', async () => {
    mockSpecialtiesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(NotFoundException)
    expect(mockSpecialtiesRepository.delete).not.toHaveBeenCalled()
  })

  it('invalidates individual and list caches after deletion', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.delete.mockResolvedValue(undefined)

    await useCase.execute(specialty.id)

    expect(mockCacheService.del).toHaveBeenCalledWith(`specialty:${specialty.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('specialties:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(specialty.id)).resolves.toBeUndefined()
  })
})
