import { ConflictException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { PatientGender } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { CreatePatientUseCase } from '../use-cases/create-patient.use-case'

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

const makeDto = () => ({
  fullName: faker.person.fullName(),
  documentNumber: '12345678901',
  email: faker.internet.email(),
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  gender: PatientGender.MALE,
})

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

describe('CreatePatientUseCase', () => {
  let useCase: CreatePatientUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreatePatientUseCase(
      {} as DataSource,
      mockPatientsRepository,
      mockCacheService,
    )
  })

  it('creates patient and returns response', async () => {
    const dto = makeDto()
    const created = makePatient({ fullName: dto.fullName, email: dto.email, documentNumber: dto.documentNumber })

    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockPatientsRepository.create.mockResolvedValue(created)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(mockPatientsRepository.findByDocumentNumber).toHaveBeenCalledWith(dto.documentNumber)
    expect(mockPatientsRepository.create).toHaveBeenCalledWith(dto)
    expect(result.id).toBe(created.id)
    expect(result.documentNumber).toBe(created.documentNumber)
    expect(result.phoneNumber).toBe(created.phoneNumber)
  })

  it('response does not contain version or deletedAt', async () => {
    const dto = makeDto()
    const created = makePatient()

    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockPatientsRepository.create.mockResolvedValue(created)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws ConflictException when documentNumber already in use', async () => {
    const dto = makeDto()
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(makePatient() as any)

    await expect(useCase.execute(dto)).rejects.toThrow(ConflictException)
    expect(mockPatientsRepository.create).not.toHaveBeenCalled()
  })

  it('invalidates list cache after creation', async () => {
    const dto = makeDto()
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockPatientsRepository.create.mockResolvedValue(makePatient())
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('patients:list*')
  })

  it('continues and returns response when cache invalidation fails', async () => {
    const dto = makeDto()
    mockPatientsRepository.findByDocumentNumber.mockResolvedValue(null)
    mockPatientsRepository.create.mockResolvedValue(makePatient())
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(dto)

    expect(result.id).toBeDefined()
  })
})
