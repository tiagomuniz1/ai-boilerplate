import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
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
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { UpdateDoctorUseCase } from '../use-cases/update-doctor.use-case'

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

const CLINIC_ID = 'fixed-clinic-uuid'
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('UpdateDoctorUseCase', () => {
  let useCase: UpdateDoctorUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateDoctorUseCase(
      mockDataSource,
      mockDoctorsRepository,
      mockSpecialtiesRepository,
      mockUsersRepository,
      mockCacheService,
    )
  })

  it('updates doctor specialties and returns response', async () => {
    const doctor = makeDoctor()
    const newSpecialty = makeSpecialty({ name: 'Neurologia' })
    const updated = makeDoctor({ id: doctor.id, specialties: [newSpecialty] })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([newSpecialty] as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { specialties: [{ specialtyId: newSpecialty.id, rqe: '4455' }] }, adminUser)

    expect(result.id).toBe(doctor.id)
    expect(result.specialties[0].name).toBe('Neurologia')
    expect(mockDoctorsRepository.update).toHaveBeenCalledWith(doctor.id, expect.anything(), null, [
      { specialty: newSpecialty, rqe: '4455' },
    ])
  })

  it('does not call findByIds when specialties is not provided', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id, bio: 'Updated bio' })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(doctor.id, { bio: 'Updated bio' }, adminUser)

    expect(mockSpecialtiesRepository.findByIds).not.toHaveBeenCalled()
    expect(mockDoctorsRepository.update).toHaveBeenCalledWith(doctor.id, { bio: 'Updated bio' }, null, null)
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { bio: 'test' }, adminUser)).rejects.toThrow(
      NotFoundException,
    )
  })

  it('throws UnprocessableEntityException when not exactly one primary CRM', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await expect(
      useCase.execute(
        doctor.id,
        {
          crms: [
            { number: '11111', state: 'SP', isPrimary: false },
            { number: '22222', state: 'RJ', isPrimary: false },
          ],
        },
        adminUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockDoctorsRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException when a new CRM is already in use by another doctor', async () => {
    const doctor = makeDoctor()
    const otherDoctor = makeDoctor()

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findByCrm.mockResolvedValue(otherDoctor as any)

    await expect(
      useCase.execute(doctor.id, { crms: [{ number: '22222', state: 'SP', isPrimary: true }] }, adminUser),
    ).rejects.toThrow(ConflictException)
    expect(mockDoctorsRepository.update).not.toHaveBeenCalled()
  })

  it('allows keeping a CRM that belongs to the same doctor (no self conflict)', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findByCrm.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { crms: [{ number: '12345', state: 'SP', isPrimary: true }] }, adminUser)

    expect(result.crms[0]).toMatchObject({ number: '12345', state: 'SP', isPrimary: true })
  })

  it('throws UnprocessableEntityException when a specialtyId is not found', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    await expect(
      useCase.execute(doctor.id, { specialties: [{ specialtyId: faker.string.uuid() }] }, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockDoctorsRepository.update).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when the specialty list has duplicates', async () => {
    const doctor = makeDoctor()
    const specialty = makeSpecialty()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await expect(
      useCase.execute(doctor.id, { specialties: [{ specialtyId: specialty.id }, { specialtyId: specialty.id }] }, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockDoctorsRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException on optimistic lock version mismatch', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockRejectedValue(
      new OptimisticLockVersionMismatchError('Doctor', 1, 2),
    )

    await expect(useCase.execute(doctor.id, { bio: 'test' }, adminUser)).rejects.toThrow(
      ConflictException,
    )
  })

  it('throws ConflictException when DB CRM unique constraint fires (race condition)', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findByCrm.mockResolvedValue(null)
    mockDoctorsRepository.update.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.DOCTOR_CRMS))

    await expect(
      useCase.execute(doctor.id, { crms: [{ number: '99999', state: 'SP', isPrimary: true }] }, adminUser),
    ).rejects.toThrow(ConflictException)
  })

  it('rethrows non-OptimisticLock errors from repository update', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockRejectedValue(new Error('Unexpected DB error'))

    await expect(useCase.execute(doctor.id, { bio: 'test' }, adminUser)).rejects.toThrow(
      'Unexpected DB error',
    )
  })

  it('invalidates individual and list caches after update', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(doctor.id, { bio: 'test' }, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`doctor:${CLINIC_ID}:${doctor.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`doctors:list:${CLINIC_ID}*`)
  })

  it('continues when cache invalidation fails', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(doctor.id, { bio: 'test' }, adminUser)

    expect(result.id).toBeDefined()
  })

  it('allows DOCTOR to update their own profile', async () => {
    const doctor = makeDoctor()
    const doctorUser: ICurrentUser = { id: doctor.user.id, role: UserRole.DOCTOR, clinicId: CLINIC_ID }
    const updated = makeDoctor({ id: doctor.id })

    mockDoctorsRepository.findByUserId.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { bio: 'My bio' }, doctorUser)

    expect(result.id).toBe(doctor.id)
  })

  it('throws ForbiddenException when DOCTOR tries to update another doctor profile', async () => {
    const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR, clinicId: CLINIC_ID }
    const ownDoctor = makeDoctor()
    const otherDoctorId = faker.string.uuid()

    mockDoctorsRepository.findByUserId.mockResolvedValue(ownDoctor as any)

    await expect(useCase.execute(otherDoctorId, { bio: 'test' }, doctorUser)).rejects.toThrow(
      ForbiddenException,
    )
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
  })

  it('deactivates user when ADMIN sets isActive to false', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id, user: { ...doctor.user, isActive: false } })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockUsersRepository.update.mockResolvedValue({ ...doctor.user, isActive: false } as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { isActive: false }, adminUser)

    expect(mockUsersRepository.update).toHaveBeenCalledWith(
      doctor.userId,
      { isActive: false },
      expect.anything(),
    )
    expect(result.user.isActive).toBe(false)
  })

  it('activates user when ADMIN sets isActive to true', async () => {
    const doctor = makeDoctor({ user: { ...makeDoctor().user, isActive: false } })
    const updated = makeDoctor({ id: doctor.id, user: { ...doctor.user, isActive: true } })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockUsersRepository.update.mockResolvedValue({ ...doctor.user, isActive: true } as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { isActive: true }, adminUser)

    expect(mockUsersRepository.update).toHaveBeenCalledWith(
      doctor.userId,
      { isActive: true },
      expect.anything(),
    )
    expect(result.user.isActive).toBe(true)
  })

  it('throws ForbiddenException when DOCTOR tries to change isActive', async () => {
    const doctor = makeDoctor()
    const doctorUser: ICurrentUser = { id: doctor.user.id, role: UserRole.DOCTOR, clinicId: CLINIC_ID }

    mockDoctorsRepository.findByUserId.mockResolvedValue(doctor as any)

    await expect(useCase.execute(doctor.id, { isActive: false }, doctorUser)).rejects.toThrow(
      ForbiddenException,
    )
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('does not call usersRepository when isActive is not provided', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id, bio: 'Updated bio' })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(doctor.id, { bio: 'Updated bio' }, adminUser)

    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('also invalidates user cache when isActive is updated', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockUsersRepository.update.mockResolvedValue({ ...doctor.user, isActive: false } as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(doctor.id, { isActive: false }, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${doctor.userId}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })
})
