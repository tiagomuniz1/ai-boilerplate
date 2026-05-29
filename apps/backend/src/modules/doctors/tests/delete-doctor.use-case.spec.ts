import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { DeleteDoctorUseCase } from '../use-cases/delete-doctor.use-case'

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
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

const makeDoctor = () => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email() } as any,
  crmNumber: '12345/SP',
  specialties: [{ id: faker.string.uuid(), name: 'Cardiologia' }],
  bio: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

describe('DeleteDoctorUseCase', () => {
  let useCase: DeleteDoctorUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteDoctorUseCase(
      {} as DataSource,
      mockDoctorsRepository,
      mockCacheService,
    )
  })

  it('deletes doctor successfully', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await expect(useCase.execute(doctor.id)).resolves.toBeUndefined()
    expect(mockDoctorsRepository.delete).toHaveBeenCalledWith(doctor.id)
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(NotFoundException)
    expect(mockDoctorsRepository.delete).not.toHaveBeenCalled()
  })

  it('invalidates individual and list caches after deletion', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(doctor.id)

    expect(mockCacheService.del).toHaveBeenCalledWith(`doctor:${doctor.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('doctors:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(doctor.id)).resolves.toBeUndefined()
  })
})
