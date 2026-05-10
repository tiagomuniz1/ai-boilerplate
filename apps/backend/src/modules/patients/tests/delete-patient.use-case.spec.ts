import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { PatientGender } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { DeletePatientUseCase } from '../use-cases/delete-patient.use-case'

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

const makePatient = () => ({
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
})

describe('DeletePatientUseCase', () => {
  let useCase: DeletePatientUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeletePatientUseCase(
      {} as DataSource,
      mockPatientsRepository,
      mockCacheService,
    )
  })

  it('deletes patient and invalidates cache', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(patient.id)

    expect(mockPatientsRepository.findById).toHaveBeenCalledWith(patient.id)
    expect(mockPatientsRepository.delete).toHaveBeenCalledWith(patient.id)
    expect(mockCacheService.del).toHaveBeenCalledWith(`patient:${patient.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('patients:list*')
  })

  it('throws NotFoundException when patient does not exist', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(NotFoundException)
    expect(mockPatientsRepository.delete).not.toHaveBeenCalled()
  })

  it('continues without throwing when cache invalidation fails', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(patient.id)).resolves.toBeUndefined()
  })

  it('returns void on success', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id)

    expect(result).toBeUndefined()
  })
})
