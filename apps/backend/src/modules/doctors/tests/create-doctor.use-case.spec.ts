import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { DB_UNIQUE_CONSTRAINTS } from '../../../common/utils/db-constraint.utils'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { SendSetPasswordEmailUseCase } from '../../auth/use-cases/send-set-password-email.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { CreateDoctorUseCase } from '../use-cases/create-doctor.use-case'

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

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrm: jest.fn(),
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

const makeCrm = (overrides = {}) => ({
  id: faker.string.uuid(),
  number: '12345',
  state: 'SP',
  isPrimary: true,
  ...overrides,
})

const makeDoctorSpecialty = (specialty = makeSpecialty(), rqe: string | null = null) => ({
  id: faker.string.uuid(),
  specialtyId: specialty.id,
  specialty,
  rqe,
})

const makeDoctor = (overrides: any = {}) => {
  const { specialties, crms, ...rest } = overrides
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email(), isActive: true } as any,
    crms: crms ?? [makeCrm()],
    doctorSpecialties: (specialties ?? [makeSpecialty()]).map((specialty: any) => makeDoctorSpecialty(specialty)),
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
  crms: [{ number: '12345', state: 'SP', isPrimary: true }],
  specialties: specialtyIds.map((specialtyId) => ({ specialtyId })),
})

const makeNewUserDto = (specialtyIds = [faker.string.uuid()]) => ({
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  crms: [{ number: '12345', state: 'SP', isPrimary: true }],
  specialties: specialtyIds.map((specialtyId) => ({ specialtyId })),
})

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('CreateDoctorUseCase', () => {
  let useCase: CreateDoctorUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateDoctorUseCase(
      mockDataSource,
      mockDoctorsRepository,
      mockUsersRepository,
      mockSpecialtiesRepository,
      mockCacheService,
      mockSendSetPasswordEmailUseCase,
    )
  })

  it('creates doctor and returns response with crms and specialties', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    const created = makeDoctor({ userId: user.id, user, specialties: [specialty] })

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.id).toBe(created.id)
    expect(result.user.id).toBe(user.id)
    expect(result.crms).toHaveLength(1)
    expect(result.crms[0]).toMatchObject({ number: '12345', state: 'SP', isPrimary: true })
    expect(result.specialties).toHaveLength(1)
    expect(result.specialties[0].name).toBe(specialty.name)
    expect(result.specialties[0].rqe).toBeNull()
  })

  it('persists the rqe provided per specialty', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = {
      userId: user.id,
      crms: [{ number: '12345', state: 'SP', isPrimary: true }],
      specialties: [{ specialtyId: specialty.id, rqe: '6789' }],
    }
    const created = makeDoctor({
      userId: user.id,
      user,
      crms: [makeCrm()],
    })
    created.doctorSpecialties = [makeDoctorSpecialty(specialty, '6789')]

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.specialties[0].rqe).toBe('6789')
    expect(mockDoctorsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id }),
      CLINIC_ID,
      dto.crms,
      [{ specialty, rqe: '6789' }],
    )
  })

  it('response does not contain version or deletedAt', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    const created = makeDoctor({ userId: user.id, user, specialties: [specialty] })

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws UnprocessableEntityException when not exactly one primary CRM', async () => {
    const dto = {
      userId: faker.string.uuid(),
      crms: [
        { number: '12345', state: 'SP', isPrimary: false },
        { number: '67890', state: 'RJ', isPrimary: false },
      ],
      specialties: [{ specialtyId: faker.string.uuid() }],
    }

    await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when the CRM list has duplicates', async () => {
    const dto = {
      userId: faker.string.uuid(),
      crms: [
        { number: '12345', state: 'SP', isPrimary: true },
        { number: '12345', state: 'SP', isPrimary: false },
      ],
      specialties: [{ specialtyId: faker.string.uuid() }],
    }

    await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when user does not exist', async () => {
    const specialty = makeSpecialty()
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(makeDto(), adminCurrentUser)).rejects.toThrow(NotFoundException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws ConflictException when user already has a doctor profile', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)

    await expect(useCase.execute(makeDto(user.id), adminCurrentUser)).rejects.toThrow(ConflictException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws ConflictException when a CRM is already in use', async () => {
    mockDoctorsRepository.findByCrm.mockResolvedValue(makeDoctor() as any)

    await expect(useCase.execute(makeDto(), adminCurrentUser)).rejects.toThrow(ConflictException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when a specialtyId is not found', async () => {
    const user = makeUser()
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(makeDto(user.id, [faker.string.uuid()]), adminCurrentUser)).rejects.toThrow(
      UnprocessableEntityException,
    )
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when the specialty list has duplicates', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id, specialty.id])

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)

    await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
  })

  it('passes resolved crms and specialties to repository create', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])

    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ user, specialties: [specialty] }) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto, adminCurrentUser)

    expect(mockDoctorsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: dto.userId }),
      CLINIC_ID,
      dto.crms,
      [{ specialty, rqe: null }],
    )
  })

  it('invalidates list cache after creation', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ user }) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto, adminCurrentUser)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`doctors:list:${CLINIC_ID}*`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  describe('existing patient user promotion', () => {
    it('promotes PATIENT user to DOCTOR and activates account in a transaction', async () => {
      const user = { ...makeUser(), role: UserRole.PATIENT, isActive: false }
      const specialty = makeSpecialty()
      const dto = makeDto(user.id, [specialty.id])
      const created = makeDoctor({ userId: user.id, user })

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findById.mockResolvedValue(user)
      mockDoctorsRepository.findByUserId.mockResolvedValue(null)
      mockUsersRepository.update.mockResolvedValue({ ...user, role: UserRole.DOCTOR, isActive: true } as any)
      mockDoctorsRepository.create.mockResolvedValue(created as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)
      mockCacheService.del.mockResolvedValue(undefined)

      const result = await useCase.execute(dto, adminCurrentUser)

      expect(result.id).toBe(created.id)
      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        user.id,
        { role: UserRole.DOCTOR, isActive: true },
        expect.anything(),
      )
      expect(mockDoctorsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user.id }),
        CLINIC_ID,
        dto.crms,
        [{ specialty, rqe: null }],
        expect.anything(),
      )
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
    })

    it('invalidates individual user cache when user is promoted', async () => {
      const user = { ...makeUser(), role: UserRole.PATIENT, isActive: false }
      const specialty = makeSpecialty()
      const dto = makeDto(user.id, [specialty.id])

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findById.mockResolvedValue(user)
      mockDoctorsRepository.findByUserId.mockResolvedValue(null)
      mockUsersRepository.update.mockResolvedValue(user as any)
      mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ userId: user.id, user }) as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)
      mockCacheService.del.mockResolvedValue(undefined)

      await useCase.execute(dto, adminCurrentUser)

      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${user.id}`)
    })

    it('does not update user role when existing user is not PATIENT', async () => {
      const user = { ...makeUser(), role: UserRole.USER }
      const specialty = makeSpecialty()
      const dto = makeDto(user.id, [specialty.id])

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findById.mockResolvedValue(user)
      mockDoctorsRepository.findByUserId.mockResolvedValue(null)
      mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ userId: user.id, user }) as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      await useCase.execute(dto, adminCurrentUser)

      expect(mockUsersRepository.update).not.toHaveBeenCalled()
      expect(mockCacheService.del).not.toHaveBeenCalledWith(expect.stringContaining('user:'))
    })
  })

  it('throws ConflictException when DB CRM unique constraint fires (race condition)', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.DOCTOR_CRMS))

    await expect(useCase.execute(makeDto(user.id, [specialty.id]), adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('throws ConflictException when DB user_id unique constraint fires (race condition)', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.DOCTORS_USER_ID))

    await expect(useCase.execute(makeDto(user.id, [specialty.id]), adminCurrentUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows non-unique-constraint errors from repository create', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockRejectedValue(new Error('Database failure'))

    await expect(useCase.execute(makeDto(user.id, [specialty.id]), adminCurrentUser)).rejects.toThrow('Database failure')
  })

  it('continues when cache invalidation fails', async () => {
    const user = makeUser()
    const specialty = makeSpecialty()
    const dto = makeDto(user.id, [specialty.id])
    mockUsersRepository.findById.mockResolvedValue(user)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.create.mockResolvedValue(makeDoctor({ user }) as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.id).toBeDefined()
  })

  describe('new user path (inline user creation)', () => {
    it('creates user with DOCTOR role then creates doctor in transaction', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()
      const created = makeDoctor({ userId: newUser.id, user: newUser, specialties: [specialty] })

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockDoctorsRepository.create.mockResolvedValue(created as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      const result = await useCase.execute(dto, adminCurrentUser)

      expect(result.id).toBe(created.id)
      expect(result.user.id).toBe(newUser.id)
      expect(mockUsersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: dto.fullName, email: dto.email, role: UserRole.DOCTOR, isActive: true }),
        CLINIC_ID,
        expect.anything(),
      )
      expect(mockDoctorsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: newUser.id }),
        CLINIC_ID,
        dto.crms,
        [{ specialty, rqe: null }],
        expect.anything(),
      )
    })

    it('throws UnprocessableEntityException when neither userId nor fullName+email are provided', async () => {
      const dto = { crms: [{ number: '12345', state: 'SP', isPrimary: true }], specialties: [{ specialtyId: faker.string.uuid() }] }

      await expect(useCase.execute(dto as any, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
      expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
    })

    it('throws ConflictException when email is already in use', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(makeUser())

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
      expect(mockDoctorsRepository.create).not.toHaveBeenCalled()
    })

    it('throws ConflictException when DB email unique constraint fires (race condition)', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC))

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when DB CRM unique constraint fires in new user transaction (race condition)', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockDoctorsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.DOCTOR_CRMS))

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when DB user_id unique constraint fires in new user transaction (race condition)', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockDoctorsRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.DOCTORS_USER_ID))

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow(ConflictException)
    })

    it('rethrows non-unique-constraint errors from new user transaction path', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockDoctorsRepository.create.mockRejectedValue(new Error('Unexpected DB error'))

      await expect(useCase.execute(dto, adminCurrentUser)).rejects.toThrow('Unexpected DB error')
    })

    it('sends set-password email after creating new user', async () => {
      const specialty = makeSpecialty()
      const dto = makeNewUserDto([specialty.id])
      const newUser = makeUser()
      const created = makeDoctor({ userId: newUser.id, user: newUser, specialties: [specialty] })

      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(newUser)
      mockDoctorsRepository.create.mockResolvedValue(created as any)
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
      const created = makeDoctor({ userId: user.id, user })

      mockUsersRepository.findById.mockResolvedValue(user)
      mockDoctorsRepository.findByUserId.mockResolvedValue(null)
      mockDoctorsRepository.findByCrm.mockResolvedValue(null)
      mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
      mockDoctorsRepository.create.mockResolvedValue(created as any)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      await useCase.execute(dto, adminCurrentUser)

      expect(mockSendSetPasswordEmailUseCase.execute).not.toHaveBeenCalled()
    })
  })
})
