import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { MedicalRecordListQueryDto } from '../dto/medical-record-list-query.dto'
import { FindMedicalRecordsByPatientUseCase } from '../use-cases/find-medical-records-by-patient.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const patientId = 'patient-uuid'
const professionalId = 'doctor-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeQuery = (overrides = {}): MedicalRecordListQueryDto => ({
  page: 1,
  limit: 20,
  patientId,
  ...overrides,
} as MedicalRecordListQueryDto)

const makeRecord = (id: string) => ({
  id,
  appointmentId: 'appt-uuid',
  patientId,
  professionalId,
  specialtyId: 'specialty-uuid',
  templateId: 'template-uuid',
  templateSchemaSnapshot: [],
  data: {},
  notes: null,
  patient: { user: { fullName: 'Patient Name' } },
  professional: { user: { fullName: 'Doctor Name' } },
  specialty: { name: 'Cardiologia' },
  createdAt: new Date(),
  updatedAt: new Date(),
})

const mockMedicalRecordsRepository: jest.Mocked<IMedicalRecordsRepository> = {
  findById: jest.fn(),
  findByAppointment: jest.fn(),
  findByPatient: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  countByClinic: jest.fn(),
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

describe('FindMedicalRecordsByPatientUseCase', () => {
  let useCase: FindMedicalRecordsByPatientUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindMedicalRecordsByPatientUseCase(
      {} as DataSource,
      mockMedicalRecordsRepository,
      mockProfessionalsRepository,
      mockCache,
    )
    mockCache.get.mockResolvedValue(null)
    mockCache.set.mockResolvedValue(undefined)
    mockMedicalRecordsRepository.findByPatient.mockResolvedValue([[makeRecord('r1') as any], 1])
  })

  it('returns paginated records for ADMIN', async () => {
    const result = await useCase.execute(patientId, makeQuery(), adminUser)
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('filters by own professionalId for DOCTOR', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    await useCase.execute(patientId, makeQuery(), doctorUser)
    expect(mockMedicalRecordsRepository.findByPatient).toHaveBeenCalledWith(
      clinicId,
      patientId,
      1,
      20,
      professionalId,
    )
  })

  it('uses professionalId filter from query for ADMIN', async () => {
    await useCase.execute(patientId, makeQuery({ professionalId: 'some-doctor' }), adminUser)
    expect(mockMedicalRecordsRepository.findByPatient).toHaveBeenCalledWith(
      clinicId,
      patientId,
      1,
      20,
      'some-doctor',
    )
  })

  it('returns cached result when available', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCache.get.mockResolvedValue(cached)
    const result = await useCase.execute(patientId, makeQuery(), adminUser)
    expect(result).toBe(cached)
    expect(mockMedicalRecordsRepository.findByPatient).not.toHaveBeenCalled()
  })

  it('writes result to cache after DB query', async () => {
    await useCase.execute(patientId, makeQuery(), adminUser)
    expect(mockCache.set).toHaveBeenCalledWith(expect.stringContaining(`medical_records:patient:${patientId}`), expect.any(Object), 60)
  })

  it('does not throw when cache read fails', async () => {
    mockCache.get.mockRejectedValue(new Error('cache error'))
    await expect(useCase.execute(patientId, makeQuery(), adminUser)).resolves.toBeDefined()
  })

  it('does not throw when cache write fails', async () => {
    mockCache.set.mockRejectedValue(new Error('cache error'))
    await expect(useCase.execute(patientId, makeQuery(), adminUser)).resolves.toBeDefined()
  })
})
