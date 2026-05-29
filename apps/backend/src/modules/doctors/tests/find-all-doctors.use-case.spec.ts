import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { FindAllDoctorsUseCase } from '../use-cases/find-all-doctors.use-case'
import { ListDoctorsQueryDto } from '../dto/list-doctors-query.dto'

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

const makeQuery = (overrides: Partial<ListDoctorsQueryDto> = {}): ListDoctorsQueryDto =>
  Object.assign(new ListDoctorsQueryDto(), { page: 1, limit: 20, ...overrides })

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN }

describe('FindAllDoctorsUseCase', () => {
  let useCase: FindAllDoctorsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllDoctorsUseCase(
      {} as DataSource,
      mockDoctorsRepository,
      mockCacheService,
    )
  })

  it('returns paginated response from repository on cache miss', async () => {
    const doctor = makeDoctor()
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findAll.mockResolvedValue([[doctor as any], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.data[0].id).toBe(doctor.id)
    expect(result.data[0].user.fullName).toBe(doctor.user.fullName)
  })

  it('returns cached result without calling repository on cache hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result).toBe(cached)
    expect(mockDoctorsRepository.findAll).not.toHaveBeenCalled()
  })

  it('calls repository with search param when provided', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    await useCase.execute(makeQuery({ search: 'Cardio' }), adminUser)

    expect(mockDoctorsRepository.findAll).toHaveBeenCalledWith(1, 20, 'Cardio')
  })

  it('uses all-key when search is absent', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    await useCase.execute(makeQuery(), adminUser)

    expect(mockCacheService.get).toHaveBeenCalledWith('doctors:list:1:20:all')
  })

  it('continues on cache read failure', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockDoctorsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.data).toHaveLength(0)
  })

  it('continues when cache write fails', async () => {
    const doctor = makeDoctor()
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findAll.mockResolvedValue([[doctor as any], 1])
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.total).toBe(1)
  })

  it('response data does not contain version or deletedAt', async () => {
    const doctor = makeDoctor()
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findAll.mockResolvedValue([[doctor as any], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.data[0]).not.toHaveProperty('version')
    expect(result.data[0]).not.toHaveProperty('deletedAt')
  })

  it('returns only own profile when DOCTOR role', async () => {
    const doctor = makeDoctor()
    const doctorUser: ICurrentUser = { id: doctor.user.id, role: UserRole.DOCTOR }
    mockDoctorsRepository.findByUserId.mockResolvedValue(doctor as any)

    const result = await useCase.execute(makeQuery(), doctorUser)

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.data[0].id).toBe(doctor.id)
    expect(mockDoctorsRepository.findAll).not.toHaveBeenCalled()
    expect(mockCacheService.get).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when DOCTOR has no doctor profile', async () => {
    const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR }
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(makeQuery(), doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('returns empty specialties array when doctor has no specialties', async () => {
    const doctor = { ...makeDoctor(), specialties: null }
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findAll.mockResolvedValue([[doctor as any], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.data[0].specialties).toEqual([])
  })
})
