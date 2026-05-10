import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { PatientGender } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { UpdatePatientUseCase } from '../use-cases/update-patient.use-case'

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByDocumentNumber: jest.fn(),
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

const makePatient = (overrides = {}) => ({
  id: faker.string.uuid(),
  fullName: faker.person.fullName(),
  documentNumber: '12345678901',
  email: faker.internet.email(),
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  gender: PatientGender.MALE,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('UpdatePatientUseCase', () => {
  let useCase: UpdatePatientUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdatePatientUseCase(
      {} as DataSource,
      mockPatientsRepository,
      mockCacheService,
    )
  })

  it('updates patient and returns response', async () => {
    const patient = makePatient()
    const updated = { ...patient, fullName: 'Nome Atualizado' }

    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, { fullName: 'Nome Atualizado' })

    expect(mockPatientsRepository.findById).toHaveBeenCalledWith(patient.id)
    expect(mockPatientsRepository.update).toHaveBeenCalledWith(patient.id, { fullName: 'Nome Atualizado' })
    expect(result.fullName).toBe('Nome Atualizado')
    expect(result).not.toHaveProperty('version')
  })

  it('throws NotFoundException when patient does not exist', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { fullName: 'Test' })).rejects.toThrow(NotFoundException)
    expect(mockPatientsRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException on OptimisticLockVersionMismatchError', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('Patient', 1, 2))

    await expect(useCase.execute(patient.id, { fullName: 'Test' })).rejects.toThrow(ConflictException)
  })

  it('propagates non-optimistic-lock errors', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockRejectedValue(new Error('Database error'))

    await expect(useCase.execute(patient.id, { fullName: 'Test' })).rejects.toThrow('Database error')
  })

  it('invalidates patient and list cache after update', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockResolvedValue(patient as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(patient.id, { fullName: 'Test' })

    expect(mockCacheService.del).toHaveBeenCalledWith(`patient:${patient.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('patients:list*')
  })

  it('continues and returns response when cache invalidation fails', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.update.mockResolvedValue(patient as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(patient.id, { fullName: 'Test' })

    expect(result.id).toBe(patient.id)
  })
})
