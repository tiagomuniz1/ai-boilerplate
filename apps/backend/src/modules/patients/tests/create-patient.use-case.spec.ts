import { ConflictException } from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { PatientGender, UserRole } from '@app/shared'
import { DB_UNIQUE_CONSTRAINTS } from '../../../common/utils/db-constraint.utils'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { CreatePatientUseCase } from '../use-cases/create-patient.use-case'

function makeUniqueViolation(constraint: string): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error())
  ;(error as any).code = '23505'
  ;(error as any).constraint = constraint
  return error
}

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByDocumentNumber: jest.fn(),
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

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: { getRepository: jest.fn() },
  }),
} as unknown as DataSource

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeDto = () => ({
  fullName: faker.person.fullName(),
  documentNumber: '12345678901',
  email: faker.internet.email(),
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  gender: PatientGender.MALE,
})

const makeUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  password: 'hashed',
  role: UserRole.PATIENT,
  isActive: false,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makePatient = (user = makeUser(), overrides = {}) => ({
  id: faker.string.uuid(),
  user,
  userId: user.id,
  documentNumber: '12345678901',
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  gender: PatientGender.MALE,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('CreatePatientUseCase', () => {
  let useCase: CreatePatientUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreatePatientUseCase(
      mockDataSource,
      mockPatientsRepository,
      mockUsersRepository,
      mockCacheService,
    )
  })

  it('creates patient and returns response with nested user', async () => {
    const dto = makeDto()
    const user = makeUser({ fullName: dto.fullName, email: dto.email })
    const patient = makePatient(user, { documentNumber: dto.documentNumber })

    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(user as any)
    mockPatientsRepository.create.mockResolvedValue(patient as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.id).toBe(patient.id)
    expect(result.user.fullName).toBe(user.fullName)
    expect(result.user.email).toBe(user.email)
    expect(result.user.isActive).toBe(false)
    expect(result.documentNumber).toBe(patient.documentNumber)
    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('creates User with role PATIENT and isActive false', async () => {
    const dto = makeDto()
    const user = makeUser()
    const patient = makePatient(user)

    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(user as any)
    mockPatientsRepository.create.mockResolvedValue(patient as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto, adminCurrentUser)

    expect(mockUsersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: dto.fullName,
        email: dto.email,
        role: UserRole.PATIENT,
        isActive: false,
      }),
      expect.anything(),
      expect.anything(),
    )
  })

  it('throws ConflictException when documentNumber already in use', async () => {
    const dto = makeDto()
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(makePatient() as any)

    await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
    expect(mockUsersRepository.create).not.toHaveBeenCalled()
    expect(mockPatientsRepository.create).not.toHaveBeenCalled()
  })

  it('throws ConflictException when email already in use', async () => {
    const dto = makeDto()
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockUsersRepository.findByEmail.mockResolvedValue(makeUser() as any)

    await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
    expect(mockPatientsRepository.create).not.toHaveBeenCalled()
  })

  it('invalidates patients and users list caches after creation', async () => {
    const dto = makeDto()
    const user = makeUser()
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(user as any)
    mockPatientsRepository.create.mockResolvedValue(makePatient(user) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto, adminCurrentUser)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`patients:list:${CLINIC_ID}*`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('throws ConflictException when DB email unique constraint fires (race condition)', async () => {
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.USERS_EMAIL))

    await expect(useCase.execute(makeDto(), adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('throws ConflictException when DB document_number unique constraint fires (race condition)', async () => {
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(makeUser() as any)
    mockPatientsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.PATIENTS_DOCUMENT))

    await expect(useCase.execute(makeDto(), adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows non-unique-constraint errors from transaction', async () => {
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockRejectedValue(new Error('Database failure'))

    await expect(useCase.execute(makeDto(), adminCurrentUser)).rejects.toThrow('Database failure')
  })

  it('continues and returns response when cache invalidation fails', async () => {
    const dto = makeDto()
    const user = makeUser()
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(user as any)
    mockPatientsRepository.create.mockResolvedValue(makePatient(user) as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.id).toBeDefined()
  })
})
