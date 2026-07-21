import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { DeleteMedicalRecordUseCase } from '../use-cases/delete-medical-record.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const recordId = 'record-uuid'
const patientId = 'patient-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }

const makeRecord = () => ({
  id: recordId,
  patientId,
  professional: { user: { fullName: 'Doctor Name' } },
  patient: { user: { fullName: 'Patient Name' } },
  specialty: { name: 'Cardio' },
})

const mockMedicalRecordsRepository: jest.Mocked<IMedicalRecordsRepository> = {
  findById: jest.fn(),
  findByAppointment: jest.fn(),
  findByPatient: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('DeleteMedicalRecordUseCase', () => {
  let useCase: DeleteMedicalRecordUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteMedicalRecordUseCase({} as DataSource, mockMedicalRecordsRepository, mockCache)
    mockMedicalRecordsRepository.findById.mockResolvedValue(makeRecord() as any)
    mockMedicalRecordsRepository.delete.mockResolvedValue(undefined)
    mockCache.delByPattern.mockResolvedValue(undefined)
  })

  it('soft deletes the record', async () => {
    await useCase.execute(recordId, adminUser)
    expect(mockMedicalRecordsRepository.delete).toHaveBeenCalledWith(recordId, clinicId)
  })

  it('throws NotFoundException when record not found', async () => {
    mockMedicalRecordsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(recordId, adminUser)).rejects.toThrow(NotFoundException)
    expect(mockMedicalRecordsRepository.delete).not.toHaveBeenCalled()
  })

  it('invalidates patient cache after delete', async () => {
    await useCase.execute(recordId, adminUser)
    expect(mockCache.delByPattern).toHaveBeenCalledWith(`medical_records:patient:${patientId}*`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCache.delByPattern.mockRejectedValue(new Error('cache error'))
    await expect(useCase.execute(recordId, adminUser)).resolves.toBeUndefined()
  })
})
