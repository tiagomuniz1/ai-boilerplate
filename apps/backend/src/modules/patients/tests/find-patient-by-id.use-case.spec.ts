import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { PatientGender, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { FindPatientByIdUseCase } from '../use-cases/find-patient-by-id.use-case'

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByDocumentNumber: jest.fn(),
  findActiveDependents: jest.fn().mockResolvedValue([]),
  findResponsiblePatientsByIds: jest.fn().mockResolvedValue([]),
  findDependentsByResponsibleIds: jest.fn().mockResolvedValue([]),
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

const makePatient = (overrides = {}) => {
  const user = makeUser()
  return {
    id: faker.string.uuid(),
    user,
    userId: user.id,
    documentNumber: '12345678901',
    phoneNumber: '(11) 99999-9999',
    birthDate: '1990-05-15',
    gender: PatientGender.MALE,
    responsiblePatientId: null,
    kinshipType: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('FindPatientByIdUseCase', () => {
  let useCase: FindPatientByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindPatientByIdUseCase(
      {} as DataSource,
      mockPatientsRepository,
      mockCacheService,
    )
  })

  it('returns cached response on cache hit without calling repository', async () => {
    const id = faker.string.uuid()
    const cached = { id, user: { fullName: 'João' } }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(id, adminCurrentUser)

    expect(result).toBe(cached)
    expect(mockPatientsRepository.findById).not.toHaveBeenCalled()
  })

  it('fetches from repository on cache miss and caches result with 300s TTL', async () => {
    const patient = makePatient()
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, adminCurrentUser)

    expect(mockPatientsRepository.findById).toHaveBeenCalledWith(patient.id, CLINIC_ID)
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `patient:${CLINIC_ID}:${patient.id}`,
      expect.objectContaining({ id: patient.id }),
      300,
    )
    expect(result.id).toBe(patient.id)
    expect(result).not.toHaveProperty('version')
  })

  it('throws NotFoundException when patient not found', async () => {
    const id = faker.string.uuid()
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(id, adminCurrentUser)).rejects.toThrow(NotFoundException)
  })

  it('continues without cache when cache read fails', async () => {
    const patient = makePatient()
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, adminCurrentUser)

    expect(result.id).toBe(patient.id)
  })

  it('returns result even when cache write fails', async () => {
    const patient = makePatient()
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(patient.id, adminCurrentUser)

    expect(result.id).toBe(patient.id)
  })

  it('populates responsiblePatient when the patient is a dependent', async () => {
    const responsible = makePatient()
    const patient = makePatient({ documentNumber: null, responsiblePatientId: responsible.id, kinshipType: 'filho' })
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findById
      .mockResolvedValueOnce(patient as any)
      .mockResolvedValueOnce(responsible as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, adminCurrentUser)

    expect(result.responsiblePatient).toEqual({
      id: responsible.id,
      fullName: responsible.user.fullName,
      documentNumber: responsible.documentNumber,
    })
  })

  it('populates dependents when the patient is a titular', async () => {
    const patient = makePatient()
    const dependent = makePatient({ responsiblePatientId: patient.id, kinshipType: 'filho' })
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.findActiveDependents.mockResolvedValue([dependent as any])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, adminCurrentUser)

    expect(result.dependents).toEqual([{ id: dependent.id, fullName: dependent.user.fullName, kinshipType: 'filho' }])
  })
})
