import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
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

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeDoctor = (overrides = {}) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email() } as any,
  crmNumber: '12345/SP',
  specialty: 'Cardiologia',
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
      mockCacheService,
    )
  })

  it('updates doctor and returns response', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id, specialty: 'Neurologia' })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findByCrmNumber.mockResolvedValue(null)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { specialty: 'Neurologia' }, adminUser)

    expect(result.id).toBe(doctor.id)
    expect(result.specialty).toBe('Neurologia')
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { specialty: 'Neurologia' }, adminUser)).rejects.toThrow(
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

  it('throws ConflictException on optimistic lock version mismatch', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockRejectedValue(
      new OptimisticLockVersionMismatchError('Doctor', 1, 2),
    )

    await expect(useCase.execute(doctor.id, { specialty: 'Neurologia' }, adminUser)).rejects.toThrow(
      ConflictException,
    )
  })

  it('rethrows non-OptimisticLock errors from repository update', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockRejectedValue(new Error('Unexpected DB error'))

    await expect(useCase.execute(doctor.id, { specialty: 'Neurologia' }, adminUser)).rejects.toThrow(
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

    await useCase.execute(doctor.id, { specialty: 'Neurologia' }, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`doctor:${doctor.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('doctors:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const doctor = makeDoctor()
    const updated = makeDoctor({ id: doctor.id })

    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(doctor.id, { specialty: 'Neurologia' }, adminUser)

    expect(result.id).toBeDefined()
  })

  it('allows DOCTOR to update their own profile', async () => {
    const doctor = makeDoctor()
    const doctorUser: ICurrentUser = { id: doctor.user.id, role: UserRole.DOCTOR }
    const updated = makeDoctor({ id: doctor.id, specialty: 'Neurologia' })

    mockDoctorsRepository.findByUserId.mockResolvedValue(doctor as any)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, { specialty: 'Neurologia' }, doctorUser)

    expect(result.id).toBe(doctor.id)
  })

  it('throws ForbiddenException when DOCTOR tries to update another doctor profile', async () => {
    const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR }
    const ownDoctor = makeDoctor()
    const otherDoctorId = faker.string.uuid()

    mockDoctorsRepository.findByUserId.mockResolvedValue(ownDoctor as any)

    await expect(useCase.execute(otherDoctorId, { specialty: 'Neurologia' }, doctorUser)).rejects.toThrow(
      ForbiddenException,
    )
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
  })
})
