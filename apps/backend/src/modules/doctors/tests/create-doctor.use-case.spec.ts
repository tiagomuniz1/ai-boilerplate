import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { CreateDoctorUseCase } from '../use-cases/create-doctor.use-case'

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockSpecialtiesRepository: jest.Mocked<ISpecialtiesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByName: jest.fn(),
  countLinkedDoctors: jest.fn(),
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

const makeUser = () => ({
  id: faker.string.uuid(),
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  password: 'hashed',
  role: 'user' as any,
  isActive: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

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

const makeDoctor = (overrides = {}) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email() } as any,
  crmNumber: '12345/SP',
  specialties: [makeSpecialty()],
  bio: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makeDto = (userId = faker.string.uuid(), specialtyIds = [faker.string.uuid()]) => ({
  userId,
  crmNumber: '12345/SP',
  specialtyIds,
})

describe('CreateDoctorUseCase', () => {
  let useCase: CreateDoctorUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateDoctorUseCase(
      {} as DataSource,
      mockDoctorsRepository,
      mockUsersRepository,
      mockSpecialtiesRepository,
      mockCacheService,
    )
  })

  it('creates doctor and returns response with specialties', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    const created = makeDoctor({ userId: user.id, user, specialties: [specialty] })

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(result.id).toBe(created.id)
    expect(result.user.id).toBe(user.id)
    expect(result.crmNumber).toBe(dto.crmNumber)
    expect(result.specialties).toHaveLength(1)
    expect(result.specialties[0].name).toBe(specialty.name)
  })

  it('response does not contain version or deletedAt', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    const created = makeDoctor({ userId: user.id, user, specialties: [specialty] })

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws NotFoundException when user does not exist', async () => {
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(makeDto())).rejects.toThrow(NotFoundException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws ConflictException when user already has a doctor profile', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)

    await expect(useCase.execute(makeDto(user.id))).rejects.toThrow(ConflictException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws ConflictException when CRM number is already in use', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(makeDoctor() as any)

    await expect(useCase.execute(makeDto(user.id))).rejects.toThrow(ConflictException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when a specialtyId is not found', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    await expect(useCase.execute(makeDto(user.id, [faker.string.uuid()]))).rejects.toThrow(
      UnprocessableEntityException,
    )
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('deduplicates specialtyIds before calling findByIds', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id, specialty.id])

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ user, specialties: [specialty] }) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto)

    expect(mockSpecialtiesRepository.findByIds).toHaveBeenCalledWith([specialty.id])
  })

  it('passes resolved specialties to repository create', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ user, specialties: [specialty] }) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto)

    expect(mockDoctorsRepository.create).toHaveBeenCalledWith(dto, [specialty])
  })

  it('invalidates list cache after creation', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ user }) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('doctors:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ user }) as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(dto)

    expect(result.id).toBeDefined()
  })
})
