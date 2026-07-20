import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CouncilType, UserRole } from '@app/shared'
import { DB_UNIQUE_CONSTRAINTS } from '../../../common/utils/db-constraint.utils'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { SendSetPasswordEmailUseCase } from '../../auth/use-cases/send-set-password-email.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'
import { CreateProfessionalUseCase } from '../use-cases/create-professional.use-case'

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

function makeUniqueViolation(constraint: string): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error())
  ;(error as any).code = '23505'
  ;(error as any).constraint = constraint
  return error
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
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
  updatePassword: jest.fn(),
  delete: jest.fn(),
}

const mockSendSetPasswordEmailUseCase = {
  execute: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<SendSetPasswordEmailUseCase>

const mockSpecialtiesRepository: jest.Mocked<ISpecialtiesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByName: jest.fn(),
  countLinkedDoctors: jest.fn(),
  countLinkedClinics: jest.fn(),
  countLinkedClinicsForAll: jest.fn(),
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

const makeUser = () => ({
  id: faker.string.uuid(),
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  password: 'hashed',
  role: 'user' as any,
  isActive: true,
  clinicId: faker.string.uuid(),
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}) as any

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

const makeRegistration = (overrides = {}) => ({
  id: faker.string.uuid(),
  councilType: CouncilType.CRM,
  number: '12345',
  state: 'SP',
  isPrimary: true,
  ...overrides,
})

const makeProfessionalSpecialty = (specialty = makeSpecialty(), registryNumber: string | null = null) => ({
  id: faker.string.uuid(),
  specialtyId: specialty.id,
  specialty,
  registryNumber,
})

const makeProfessional = (overrides: any = {}) => {
  const { specialties, registrations, ...rest } = overrides
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email(), isActive: true } as any,
    registrations: registrations ?? [makeRegistration()],
    professionalSpecialties: (specialties ?? [makeSpecialty()]).map((specialty: any) => makeProfessionalSpecialty(specialty)),
    bio: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...rest,
  }
}

const makeDto = (userId = faker.string.uuid(), specialtyIds = [faker.string.uuid()]) => ({
  userId,
  registrations: [{ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  specialties: specialtyIds.map((specialtyId) => ({ specialtyId })),
})

const makeNewUserDto = (specialtyIds = [faker.string.uuid()]) => ({
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  registrations: [{ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  specialties: specialtyIds.map((specialtyId) => ({ specialtyId })),
})

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('CreateProfessionalUseCase', () => {
  let useCase: CreateProfessionalUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateProfessionalUseCase(
      mockDataSource,
      mockProfessionalsRepository,
      mockUsersRepository,
      mockSpecialtiesRepository,
      mockCacheService,
      mockSendSetPasswordEmailUseCase,
    )
  })

  it('creates professional and returns response with registrations and specialties', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    const created = makeProfessional({ userId: user.id, user, specialties: [specialty] })

    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.id).toBe(created.id)
    expect(result.user.id).toBe(user.id)
    expect(result.registrations).toHaveLength(1)
    expect(result.registrations[0]).toMatchObject({ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true })
    expect(result.specialties).toHaveLength(1)
    expect(result.specialties[0].name).toBe(specialty.name)
    expect(result.specialties[0].registryNumber).toBeNull()
  })

  it('creates a generalist professional with no specialties', async () => {
    const user = makeUser()
    const dto = makeDto(user.id, [])
    const created = makeProfessional({ userId: user.id, user, specialties: [] })

    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([] as any)
    mockProfessionalsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.registrations).toHaveLength(1)
    expect(result.specialties).toHaveLength(0)
    expect(mockProfessionalsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id }),
      CLINIC_ID,
      dto.registrations,
      [],
    )
  })

  it('persists the registryNumber provided per specialty', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = {
      userId: user.id,
      registrations: [{ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
      specialties: [{ specialtyId: specialty.id, registryNumber: '6789' }],
    }
    const created = makeProfessional({
      userId: user.id,
      user,
      registrations: [makeRegistration()],
    })
    created.professionalSpecialties = [makeProfessionalSpecialty(specialty, '6789')]

    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.specialties[0].registryNumber).toBe('6789')
    expect(mockProfessionalsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id }),
      CLINIC_ID,
      dto.registrations,
      [{ specialty, registryNumber: '6789' }],
    )
  })

  it('response does not contain version or deletedAt', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    const created = makeProfessional({ userId: user.id, user, specialties: [specialty] })

    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws UnprocessableEntityException when not exactly one primary registration', async () => {
    const dto = {
      userId: faker.string.uuid(),
      registrations: [
        { councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: false },
        { councilType: CouncilType.CRM, number: '67890', state: 'RJ', isPrimary: false },
      ],
      specialties: [{ specialtyId: faker.string.uuid() }],
    }

    await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when the registration list has duplicates', async () => {
    const dto = {
      userId: faker.string.uuid(),
      registrations: [
        { councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
        { councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: false },
      ],
      specialties: [{ specialtyId: faker.string.uuid() }],
    }

    await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when user does not exist', async () => {
    const specialty = makeSpecialty()
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(makeDto(), adminCurrentUser)).rejects.toThrow(NotFoundException)
    expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
  })

  it('throws ConflictException when user already has a professional profile', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeProfessional() as any)

    await expect(useCase.execute(makeDto(user.id), adminCurrentUser)).rejects.toThrow(ConflictException)
    expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
  })

  it('throws ConflictException when a registration is already in use', async () => {
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(makeProfessional() as any)

    await expect(useCase.execute(makeDto(), adminCurrentUser)).rejects.toThrow(ConflictException)
    expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when a specialtyId is not found', async () => {
    const user = makeUser()
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])
    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(makeDto(user.id, [faker.string.uuid()]), adminCurrentUser)).rejects.toThrow(
      UnprocessableEntityException,
    )
    expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when the specialty list has duplicates', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id, specialty.id])

    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)

    await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
  })

  it('passes resolved registrations and specialties to repository create', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])

    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockResolvedValue(makeProfessional({ user, specialties: [specialty] }) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto, adminCurrentUser)

    expect(mockProfessionalsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: dto.userId }),
      CLINIC_ID,
      dto.registrations,
      [{ specialty, registryNumber: null }],
    )
  })

  it('invalidates list cache after creation', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockResolvedValue(makeProfessional({ user }) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto, adminCurrentUser)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`professionals:list:${CLINIC_ID}*`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  describe('existing patient user promotion', () => {
    it('promotes PATIENT user to DOCTOR and activates account in a transaction', async () => {
      const user = { ...makeUser(), role: UserRole.PATIENT, isActive: false }
      const specialty = makeSpecialty()
      const dto = makeDto(user.id, [specialty.id])
      const created = makeProfessional({ userId: user.id, user })

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findById.mockResolvedValue(user)
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
      mockUsersRepository.update.mockResolvedValue({ ...user, role: UserRole.DOCTOR, isActive: true } as any)
      mockProfessionalsRepository.create.mockResolvedValue(created as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)
      mockCacheService.del.mockResolvedValue(undefined)

      const result = await useCase.execute(dto, adminCurrentUser)

      expect(result.id).toBe(created.id)
      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        user.id,
        { role: UserRole.DOCTOR, isActive: true },
        expect.anything(),
      )
      expect(mockProfessionalsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user.id }),
        CLINIC_ID,
        dto.registrations,
        [{ specialty, registryNumber: null }],
        expect.anything(),
      )
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
    })

    it('invalidates individual user cache when user is promoted', async () => {
      const user = { ...makeUser(), role: UserRole.PATIENT, isActive: false }
      const specialty = makeSpecialty()
      const dto = makeDto(user.id, [specialty.id])

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findById.mockResolvedValue(user)
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
      mockUsersRepository.update.mockResolvedValue(user as any)
      mockProfessionalsRepository.create.mockResolvedValue(makeProfessional({ userId: user.id, user }) as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)
      mockCacheService.del.mockResolvedValue(undefined)

      await useCase.execute(dto, adminCurrentUser)

      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${user.id}`)
    })

    it('does not update user role when existing user is not PATIENT', async () => {
      const user = { ...makeUser(), role: UserRole.USER }
      const specialty = makeSpecialty()
      const dto = makeDto(user.id, [specialty.id])

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findById.mockResolvedValue(user)
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
      mockProfessionalsRepository.create.mockResolvedValue(makeProfessional({ userId: user.id, user }) as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      await useCase.execute(dto, adminCurrentUser)

      expect(mockUsersRepository.update).not.toHaveBeenCalled()
      expect(mockCacheService.del).not.toHaveBeenCalledWith(expect.stringContaining('user:'))
    })
  })

  it('throws ConflictException when DB registration unique constraint fires (race condition)', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.PROFESSIONAL_REGISTRATIONS))

    await expect(useCase.execute(makeDto(user.id, [specialty.id]), adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('throws ConflictException when DB user_id unique constraint fires (race condition)', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.PROFESSIONALS_USER_ID))

    await expect(useCase.execute(makeDto(user.id, [specialty.id]), adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows non-unique-constraint errors from repository create', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockRejectedValue(new Error('Database failure'))

    await expect(useCase.execute(makeDto(user.id, [specialty.id]), adminCurrentUser)).rejects.toThrow('Database failure')
  })

  it('continues when cache invalidation fails', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    mockUsersRepository.findById.mockResolvedValue(user)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockProfessionalsRepository.create.mockResolvedValue(makeProfessional({ user }) as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.id).toBeDefined()
  })

  describe('new user path (inline user creation)', () => {
    it('creates user with DOCTOR role then creates professional in transaction', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()
      const created = makeProfessional({ userId: newUser.id, user: newUser, specialties: [specialty] })

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockProfessionalsRepository.create.mockResolvedValue(created as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      const result = await useCase.execute(dto, adminCurrentUser)

      expect(result.id).toBe(created.id)
      expect(result.user.id).toBe(newUser.id)
      expect(mockUsersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: dto.fullName, email: dto.email, role: UserRole.DOCTOR, isActive: true }),
        CLINIC_ID,
        expect.anything(),
      )
      expect(mockProfessionalsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: newUser.id }),
        CLINIC_ID,
        dto.registrations,
        [{ specialty, registryNumber: null }],
        expect.anything(),
      )
    })

    it('throws UnprocessableEntityException when neither userId nor fullName+email are provided', async () => {
      const dto = {
        registrations: [{ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
        specialties: [{ specialtyId: faker.string.uuid() }],
      }

      await expect(useCase.execute(dto as any, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
      expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
    })

    it('throws ConflictException when email is already in use', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(makeUser())

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
      expect(mockProfessionalsRepository.create).not.toHaveBeenCalled()
    })

    it('throws ConflictException when DB email unique constraint fires (race condition)', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC))

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when DB registration unique constraint fires in new user transaction (race condition)', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockProfessionalsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.PROFESSIONAL_REGISTRATIONS))

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when DB user_id unique constraint fires in new user transaction (race condition)', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockProfessionalsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.PROFESSIONALS_USER_ID))

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
    })

    it('rethrows non-unique-constraint errors from new user transaction path', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockProfessionalsRepository.create.mockRejectedValue(new Error('Unexpected DB error'))

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow('Unexpected DB error')
    })

    it('sends set-password email after creating new user', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()
      const created = makeProfessional({ userId: newUser.id, user: newUser, specialties: [specialty] })

      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockProfessionalsRepository.create.mockResolvedValue(created as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      await useCase.execute(dto, adminCurrentUser)

      expect(mockSendSetPasswordEmailUseCase.execute).toHaveBeenCalledWith(
        created.user.id,
        CLINIC_ID,
      )
    })

    it('does not send set-password email when linking existing userId', async () => {
      const user = makeUser()
      const specialty = makeSpecialty()
      const dto = makeDto(user.id, [specialty.id])
      const created = makeProfessional({ userId: user.id, user })

      mockUsersRepository.findById.mockResolvedValue(user)
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
      mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockProfessionalsRepository.create.mockResolvedValue(created as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      await useCase.execute(dto, adminCurrentUser)

      expect(mockSendSetPasswordEmailUseCase.execute).not.toHaveBeenCalled()
    })
  })
})
