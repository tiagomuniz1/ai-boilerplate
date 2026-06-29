import { ConflictException } from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { RegisterClinicUseCase } from '../use-cases/register-clinic.use-case'

const mockClinicsRepository: jest.Mocked<IClinicsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateLogo: jest.fn(),
  updateLogoDark: jest.fn(),
  updateFavicon: jest.fn(),
}

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updatePassword: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: { getRepository: jest.fn() },
}

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource

function makeClinic(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: 'Clínica do Coração',
    slug: 'clinica-do-coracao',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function makeUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'hashed',
    role: UserRole.ADMIN,
    isActive: true,
    clinicId: faker.string.uuid(),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function makeDto(overrides = {}) {
  return {
    clinicName: 'Clínica do Coração',
    slug: 'clinica-do-coracao',
    adminFullName: faker.person.fullName(),
    adminEmail: faker.internet.email(),
    adminPassword: 'Password123!',
    ...overrides,
  }
}

describe('RegisterClinicUseCase', () => {
  let useCase: RegisterClinicUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    mockQueryRunner.connect.mockResolvedValue(undefined)
    mockQueryRunner.startTransaction.mockResolvedValue(undefined)
    mockQueryRunner.commitTransaction.mockResolvedValue(undefined)
    mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined)
    mockQueryRunner.release.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    useCase = new RegisterClinicUseCase(
      mockDataSource,
      mockClinicsRepository,
      mockUsersRepository,
      mockCacheService,
    )
  })

  describe('success', () => {
    it('returns RegisterClinicResponseDto with clinic and admin on success', async () => {
      const dto = makeDto()
      const clinic = makeClinic({ name: dto.clinicName, slug: dto.slug })
      const admin = makeUser({ fullName: dto.adminFullName, email: dto.adminEmail })

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(clinic as any)
      mockUsersRepository.create.mockResolvedValue(admin as any)

      const result = await useCase.execute(dto)

      expect(result.clinic.id).toBe(clinic.id)
      expect(result.clinic.name).toBe(clinic.name)
      expect(result.clinic.slug).toBe(clinic.slug)
      expect(result.admin.id).toBe(admin.id)
      expect(result.admin.fullName).toBe(admin.fullName)
      expect(result.admin.email).toBe(admin.email)
    })

    it('response does not contain password', async () => {
      const dto = makeDto()
      const clinic = makeClinic()
      const admin = makeUser()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(clinic as any)
      mockUsersRepository.create.mockResolvedValue(admin as any)

      const result = await useCase.execute(dto)

      expect(result.admin).not.toHaveProperty('password')
    })

    it('generates slug from clinicName when slug is not provided', async () => {
      const dto = makeDto({ clinicName: 'Minha Clinica', slug: undefined })
      const clinic = makeClinic({ name: 'Minha Clinica', slug: 'minha-clinica' })
      const admin = makeUser()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(clinic as any)
      mockUsersRepository.create.mockResolvedValue(admin as any)

      await useCase.execute(dto)

      expect(mockClinicsRepository.findBySlug).toHaveBeenCalledWith('minha-clinica')
      expect(mockClinicsRepository.create).toHaveBeenCalledWith(
        { name: 'Minha Clinica', slug: 'minha-clinica' },
        expect.anything(),
      )
    })

    it('uses provided slug when supplied', async () => {
      const dto = makeDto({ clinicName: 'Clínica do Coração', slug: 'clinica-do-coracao' })
      const clinic = makeClinic()
      const admin = makeUser()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(clinic as any)
      mockUsersRepository.create.mockResolvedValue(admin as any)

      await useCase.execute(dto)

      expect(mockClinicsRepository.findBySlug).toHaveBeenCalledWith('clinica-do-coracao')
    })

    it('creates admin with role ADMIN and isActive true', async () => {
      const dto = makeDto()
      const clinic = makeClinic()
      const admin = makeUser()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(clinic as any)
      mockUsersRepository.create.mockResolvedValue(admin as any)

      await useCase.execute(dto)

      expect(mockUsersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.ADMIN, isActive: true }),
        clinic.id,
        expect.anything(),
      )
    })

    it('creates admin with hashed password, not plain text', async () => {
      const dto = makeDto({ adminPassword: 'MySecret123' })
      const clinic = makeClinic()
      const admin = makeUser()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(clinic as any)
      mockUsersRepository.create.mockResolvedValue(admin as any)

      await useCase.execute(dto)

      const createCall = mockUsersRepository.create.mock.calls[0][0]
      expect(createCall.password).not.toBe('MySecret123')
      expect(createCall.password).toMatch(/^\$2[ab]\$/)
    })

    it('creates admin with clinicId from the newly created clinic', async () => {
      const dto = makeDto()
      const clinic = makeClinic()
      const admin = makeUser()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(clinic as any)
      mockUsersRepository.create.mockResolvedValue(admin as any)

      await useCase.execute(dto)

      expect(mockUsersRepository.create).toHaveBeenCalledWith(
        expect.any(Object),
        clinic.id,
        expect.anything(),
      )
    })

    it('invalidates clinics and users list caches after creation', async () => {
      const dto = makeDto()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)
      mockUsersRepository.create.mockResolvedValue(makeUser() as any)

      await useCase.execute(dto)

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('clinics:list*')
      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('users:list*')
    })

    it('continues when cache invalidation fails', async () => {
      const dto = makeDto()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)
      mockUsersRepository.create.mockResolvedValue(makeUser() as any)
      mockCacheService.delByPattern.mockRejectedValue(new Error('Redis down'))

      const result = await useCase.execute(dto)

      expect(result.clinic.id).toBeDefined()
    })

    it('executes clinic and admin creation inside a transaction', async () => {
      const dto = makeDto()

      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)
      mockUsersRepository.create.mockResolvedValue(makeUser() as any)

      await useCase.execute(dto)

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.release).toHaveBeenCalled()
    })
  })

  describe('conflict errors — pre-transaction checks', () => {
    it('throws ConflictException when slug is already in use', async () => {
      mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic() as any)

      await expect(useCase.execute(makeDto())).rejects.toThrow(
        new ConflictException('Slug already in use'),
      )
      expect(mockClinicsRepository.create).not.toHaveBeenCalled()
      expect(mockUsersRepository.create).not.toHaveBeenCalled()
    })

    it('throws ConflictException when email is already registered globally', async () => {
      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(makeUser() as any)

      await expect(useCase.execute(makeDto())).rejects.toThrow(
        new ConflictException('Email already in use'),
      )
      expect(mockClinicsRepository.create).not.toHaveBeenCalled()
      expect(mockUsersRepository.create).not.toHaveBeenCalled()
    })

    it('throws ConflictException when slug is "backoffice" (reserved)', async () => {
      await expect(useCase.execute(makeDto({ slug: 'backoffice' }))).rejects.toThrow(
        new ConflictException('Slug is reserved and cannot be used'),
      )
      expect(mockClinicsRepository.findBySlug).not.toHaveBeenCalled()
      expect(mockClinicsRepository.create).not.toHaveBeenCalled()
      expect(mockUsersRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('conflict errors — race conditions (constraint violations)', () => {
    function makeConstraintError(constraint: string): QueryFailedError {
      const error = new QueryFailedError('', [], new Error()) as any
      error.code = '23505'
      error.constraint = constraint
      return error
    }

    it('throws ConflictException when clinics_slug_unique constraint is violated', async () => {
      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockRejectedValue(makeConstraintError('clinics_slug_unique'))

      await expect(useCase.execute(makeDto())).rejects.toThrow(
        new ConflictException('Slug already in use'),
      )
    })

    it('throws ConflictException when UQ_users_email_clinic constraint is violated', async () => {
      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)
      mockUsersRepository.create.mockRejectedValue(makeConstraintError('UQ_users_email_clinic'))

      await expect(useCase.execute(makeDto())).rejects.toThrow(
        new ConflictException('Email already in use'),
      )
    })

    it('rolls back the transaction on constraint violation', async () => {
      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockRejectedValue(makeConstraintError('clinics_slug_unique'))

      await expect(useCase.execute(makeDto())).rejects.toThrow(ConflictException)

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    })

    it('rethrows unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected DB error')
      mockClinicsRepository.findBySlug.mockResolvedValue(null)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockClinicsRepository.create.mockRejectedValue(unexpectedError)

      await expect(useCase.execute(makeDto())).rejects.toThrow('Unexpected DB error')
    })
  })
})
