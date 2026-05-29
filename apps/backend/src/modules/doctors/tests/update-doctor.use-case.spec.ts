import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { UpdateDoctorUseCase } from '../use-cases/update-doctor.use-case'

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockSpecialtiesRepository: jest.Mocked<ISpecialtiesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByName: jest.fn(),
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

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN }

describe('UpdateDoctorUseCase', () => {
  let useCase: UpdateDoctorUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateDoctorUseCase(
      {} as DataSource,
      mockDoctorsRepository,
      mockSpecialtiesRepository,
      mockCacheService,
    )
  })

  it('updates doctor and returns response', async () => {
    const doctor = makeDoctor()
    const newSpecialty = makeSpecialty({ name: 'Neurologia' })
    const updated = makeDoctor({ id: doctor.id, specialties: [newSpecialty] })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([newSpecialty] as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { specialtyIds: [newSpecialty.id] }, adminUser)

    expect(result.id).toBe(doctor.id)
    expect(result.specialties[0].name).toBe('Neurologia')
  })

  it('does not call findByIds when specialtyIds is not provided', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id, bio: 'Updated bio' })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(doctor.id, { bio: 'Updated bio' }, adminUser)

    expect(mockSpecialtiesRepository.findByIds).not.toHaveBeenCalled()
    expect(mockDoctorsRepository.update).toHaveBeenCalledWith(doctor.id, { bio: 'Updated bio' }, null)
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { bio: 'test' }, adminUser)).rejects.toThrow(
      NotFoundException,
    )
  })

  it('throws ConflictException when new CRM is already in use by another doctor', async () => {
    const doctor = makeDoctor({ crmNumber: '11111/SP' })
    const otherDoctor = makeDoctor({ crmNumber: '22222/SP' })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(otherDoctor as any)

    await expect(
      useCase.execute(doctor.id, { crmNumber: '22222/SP' }, adminUser),
    ).rejects.toThrow(ConflictException)
    expect(mockDoctorsRepository.update).not.toHaveBeenCalled()
  })

  it('allows updating with the same CRM number (no conflict with self)', async () => {
    const doctor = makeDoctor({ crmNumber: '12345/SP' })
    const updated = makeDoctor({ id: doctor.id, crmNumber: '12345/SP' })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { crmNumber: '12345/SP' }, adminUser)

    expect(mockDoctorsRepository.findByCrmNumber).not.toHaveBeenCalled()
    expect(result.crmNumber).toBe('12345/SP')
  })

  it('throws UnprocessableEntityException when a specialtyId is not found', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    await expect(
      useCase.execute(doctor.id, { specialtyIds: [faker.string.uuid()] }, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockDoctorsRepository.update).not.toHaveBeenCalled()
  })

  it('deduplicates specialtyIds before calling findByIds', async () => {
    const doctor = makeDoctor()
    const specialty = makeSpecialty()
    const updated = makeDoctor({ id: doctor.id, specialties: [specialty] })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockSpecialtiesRepository.findByIds.mockResolvedValue([specialty] as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(doctor.id, { specialtyIds: [specialty.id, specialty.id] }, adminUser)

    expect(mockSpecialtiesRepository.findByIds).toHaveBeenCalledWith([specialty.id])
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

    expect(mockCacheService.del).toHaveBeenCalledWith(`doctor:${doctor.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('doctors:list*')
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
    const doctorUser: ICurrentUser = { id: doctor.user.id, role: UserRole.DOCTOR }
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
    const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR }
    const ownDoctor = makeDoctor()
    const otherDoctorId = faker.string.uuid()

    mockDoctorsRepository.findByUserId.mockResolvedValue(ownDoctor as any)

    await expect(useCase.execute(otherDoctorId, { bio: 'test' }, doctorUser)).rejects.toThrow(
      ForbiddenException,
    )
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
  })
})
