import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CouncilType, UserRole } from '@app/shared'
import { DB_UNIQUE_CONSTRAINTS } from '../../../common/utils/db-constraint.utils'

function makeUniqueViolation(constraint: string): QueryFailedError {
  const error = new QueryFailedError('UPDATE', [], new Error())
  ;(error as any).code = '23505'
  ;(error as any).constraint = constraint
  return error
}
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'
import { UpdateProfessionalUseCase } from '../use-cases/update-professional.use-case'

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
  delete: jest.fn(),
  updatePassword: jest.fn(),
}

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

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
}

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource

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

const CLINIC_ID = 'fixed-clinic-uuid'
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('UpdateProfessionalUseCase', () => {
  let useCase: UpdateProfessionalUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateProfessionalUseCase(
      mockDataSource,
      mockProfessionalsRepository,
      mockSpecialtiesRepository,
      mockUsersRepository,
      mockCacheService,
    )
  })

  it('updates professional specialties and returns response', async () => {
    const professional = makeProfessional()
    const newSpecialty = makeSpecialty({ name: 'Neurologia' })
    const updated = makeProfessional({ id: professional.id, specialties: [newSpecialty] })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([newSpecialty] as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(
      professional.id,
      { specialties: [{ specialtyId: newSpecialty.id, registryNumber: '4455' }] },
      adminUser,
    )

    expect(result.id).toBe(professional.id)
    expect(result.specialties[0].name).toBe('Neurologia')
    expect(mockProfessionalsRepository.update).toHaveBeenCalledWith(professional.id, expect.anything(), null, [
      { specialty: newSpecialty, registryNumber: '4455' },
    ])
  })

  it('does not call findByIds when specialties is not provided', async () => {
    const professional = makeProfessional()
    const updated = makeProfessional({ id: professional.id, bio: 'Updated bio' })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(professional.id, { bio: 'Updated bio' }, adminUser)

    expect(mockSpecialtiesRepository.findByIds).not.toHaveBeenCalled()
    expect(mockProfessionalsRepository.update).toHaveBeenCalledWith(professional.id, { bio: 'Updated bio' }, null, null)
  })

  it('throws NotFoundException when professional does not exist', async () => {
    mockProfessionalsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { bio: 'test' }, adminUser)).rejects.toThrow(
      NotFoundException,
    )
  })

  it('throws UnprocessableEntityException when not exactly one primary registration', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)

    await expect(
      useCase.execute(
        professional.id,
        {
          registrations: [
            { councilType: CouncilType.CRM, number: '11111', state: 'SP', isPrimary: false },
            { councilType: CouncilType.CRM, number: '22222', state: 'RJ', isPrimary: false },
          ],
        },
        adminUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockProfessionalsRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException when a new registration is already in use by another professional', async () => {
    const professional = makeProfessional()
    const otherProfessional = makeProfessional()

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(otherProfessional as any)

    await expect(
      useCase.execute(
        professional.id,
        { registrations: [{ councilType: CouncilType.CRM, number: '22222', state: 'SP', isPrimary: true }] },
        adminUser,
      ),
    ).rejects.toThrow(ConflictException)
    expect(mockProfessionalsRepository.update).not.toHaveBeenCalled()
  })

  it('allows keeping a registration that belongs to the same professional (no self conflict)', async () => {
    const professional = makeProfessional()
    const updated = makeProfessional({ id: professional.id })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(
      professional.id,
      { registrations: [{ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }] },
      adminUser,
    )

    expect(result.registrations[0]).toMatchObject({ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true })
  })

  it('throws UnprocessableEntityException when a specialtyId is not found', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    await expect(
      useCase.execute(professional.id, { specialties: [{ specialtyId: faker.string.uuid() }] }, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockProfessionalsRepository.update).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when the specialty list has duplicates', async () => {
    const professional = makeProfessional()
    const specialty = makeSpecialty()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)

    await expect(
      useCase.execute(professional.id, { specialties: [{ specialtyId: specialty.id }, { specialtyId: specialty.id }] }, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockProfessionalsRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException on optimistic lock version mismatch', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockRejectedValue(
      new OptimisticLockVersionMismatchError('Professional', 1, 2),
    )

    await expect(useCase.execute(professional.id, { bio: 'test' }, adminUser)).rejects.toThrow(
      ConflictException,
    )
  })

  it('throws ConflictException when DB registration unique constraint fires (race condition)', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.findByRegistration.mockResolvedValue(null)
    mockProfessionalsRepository.update.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.PROFESSIONAL_REGISTRATIONS))

    await expect(
      useCase.execute(
        professional.id,
        { registrations: [{ councilType: CouncilType.CRM, number: '99999', state: 'SP', isPrimary: true }] },
        adminUser,
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('rethrows non-OptimisticLock errors from repository update', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockRejectedValue(new Error('Unexpected DB error'))

    await expect(useCase.execute(professional.id, { bio: 'test' }, adminUser)).rejects.toThrow(
      'Unexpected DB error',
    )
  })

  it('invalidates individual and list caches after update', async () => {
    const professional = makeProfessional()
    const updated = makeProfessional({ id: professional.id })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(professional.id, { bio: 'test' }, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`professional:${CLINIC_ID}:${professional.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`professionals:list:${CLINIC_ID}*`)
  })

  it('continues when cache invalidation fails', async () => {
    const professional = makeProfessional()
    const updated = makeProfessional({ id: professional.id })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(professional.id, { bio: 'test' }, adminUser)

    expect(result.id).toBeDefined()
  })

  it('allows DOCTOR to update their own profile', async () => {
    const professional = makeProfessional()
    const professionalUser: ICurrentUser = { id: professional.user.id, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
    const updated = makeProfessional({ id: professional.id })

    mockProfessionalsRepository.findByUserId.mockResolvedValue(professional as any)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(professional.id, { bio: 'My bio' }, professionalUser)

    expect(result.id).toBe(professional.id)
  })

  it('throws ForbiddenException when DOCTOR tries to update another professional profile', async () => {
    const professionalUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
    const ownProfessional = makeProfessional()
    const otherProfessionalId = faker.string.uuid()

    mockProfessionalsRepository.findByUserId.mockResolvedValue(ownProfessional as any)

    await expect(useCase.execute(otherProfessionalId, { bio: 'test' }, professionalUser)).rejects.toThrow(
      ForbiddenException,
    )
    expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
  })

  it('deactivates user when ADMIN sets isActive to false', async () => {
    const professional = makeProfessional()
    const updated = makeProfessional({ id: professional.id, user: { ...professional.user, isActive: false } })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockUsersRepository.update.mockResolvedValue({ ...professional.user, isActive: false } as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(professional.id, { isActive: false }, adminUser)

    expect(mockUsersRepository.update).toHaveBeenCalledWith(
      professional.userId,
      { isActive: false },
      expect.anything(),
    )
    expect(result.user.isActive).toBe(false)
  })

  it('activates user when ADMIN sets isActive to true', async () => {
    const professional = makeProfessional({ user: { ...makeProfessional().user, isActive: false } })
    const updated = makeProfessional({ id: professional.id, user: { ...professional.user, isActive: true } })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockUsersRepository.update.mockResolvedValue({ ...professional.user, isActive: true } as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(professional.id, { isActive: true }, adminUser)

    expect(mockUsersRepository.update).toHaveBeenCalledWith(
      professional.userId,
      { isActive: true },
      expect.anything(),
    )
    expect(result.user.isActive).toBe(true)
  })

  it('throws ForbiddenException when DOCTOR tries to change isActive', async () => {
    const professional = makeProfessional()
    const professionalUser: ICurrentUser = { id: professional.user.id, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }

    mockProfessionalsRepository.findByUserId.mockResolvedValue(professional as any)

    await expect(useCase.execute(professional.id, { isActive: false }, professionalUser)).rejects.toThrow(
      ForbiddenException,
    )
    expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('does not call usersRepository when isActive is not provided', async () => {
    const professional = makeProfessional()
    const updated = makeProfessional({ id: professional.id, bio: 'Updated bio' })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(professional.id, { bio: 'Updated bio' }, adminUser)

    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('also invalidates user cache when isActive is updated', async () => {
    const professional = makeProfessional()
    const updated = makeProfessional({ id: professional.id })

    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.update.mockResolvedValue(updated as any)
    mockUsersRepository.update.mockResolvedValue({ ...professional.user, isActive: false } as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(professional.id, { isActive: false }, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${professional.userId}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })
})
