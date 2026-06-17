import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IClinicSpecialtiesRepository } from '../repositories/clinic-specialties.repository.interface'
import { UnlinkSpecialtyFromClinicUseCase } from '../use-cases/unlink-specialty-from-clinic.use-case'

const mockClinicSpecialtiesRepository: jest.Mocked<IClinicSpecialtiesRepository> = {
  findByClinicId: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  link: jest.fn(),
  unlink: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeClinicSpecialty = (clinicId: string, specialtyId: string) => ({
  id: faker.string.uuid(),
  clinicId,
  specialtyId,
  createdAt: new Date(),
})

describe('UnlinkSpecialtyFromClinicUseCase', () => {
  let useCase: UnlinkSpecialtyFromClinicUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UnlinkSpecialtyFromClinicUseCase(
      {} as DataSource,
      mockClinicSpecialtiesRepository,
      mockCacheService,
    )
  })

  it('unlinks specialty from clinic successfully', async () => {
    const clinicId = faker.string.uuid()
    const specialtyId = faker.string.uuid()
    const existing = makeClinicSpecialty(clinicId, specialtyId)

    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(existing as any)
    mockClinicSpecialtiesRepository.unlink.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await expect(useCase.execute(clinicId, specialtyId)).resolves.toBeUndefined()

    expect(mockClinicSpecialtiesRepository.unlink).toHaveBeenCalledWith(existing.id)
  })

  it('throws NotFoundException when specialty is not linked to clinic', async () => {
    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(null)

    await expect(
      useCase.execute(faker.string.uuid(), faker.string.uuid()),
    ).rejects.toThrow(NotFoundException)

    expect(mockClinicSpecialtiesRepository.unlink).not.toHaveBeenCalled()
  })

  it('invalidates clinic cache after unlinking', async () => {
    const clinicId = faker.string.uuid()
    const specialtyId = faker.string.uuid()
    const existing = makeClinicSpecialty(clinicId, specialtyId)

    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(existing as any)
    mockClinicSpecialtiesRepository.unlink.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(clinicId, specialtyId)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`clinic-specialties:${clinicId}*`)
  })

  it('continues when cache invalidation fails', async () => {
    const clinicId = faker.string.uuid()
    const specialtyId = faker.string.uuid()
    const existing = makeClinicSpecialty(clinicId, specialtyId)

    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(existing as any)
    mockClinicSpecialtiesRepository.unlink.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(clinicId, specialtyId)).resolves.toBeUndefined()
  })
})
