import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { AppointmentStatus, MedicalRecordFieldType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { ValidateRecordDataService } from '../services/validate-record-data.service'
import { UpdateMedicalRecordUseCase } from '../use-cases/update-medical-record.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const patientId = 'patient-uuid'
const recordId = 'record-uuid'
const appointmentId = 'appt-uuid'
const specialtyId = 'specialty-uuid'
const templateId = 'template-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeSnapshot = () => [
  {
    key: 'notes_0ab1',
    label: 'Notes',
    type: MedicalRecordFieldType.TEXT,
    required: false,
    order: 1,
    options: null,
    placeholder: null,
    helpText: null,
    canonical: false,
    canonicalKey: null,
  },
]

const makeRecord = (overrides = {}) => ({
  id: recordId,
  appointmentId,
  patientId,
  doctorId,
  specialtyId,
  templateId,
  templateSchemaSnapshot: makeSnapshot(),
  data: {},
  notes: null,
  patient: { user: { fullName: 'Patient Name' } },
  doctor: { user: { fullName: 'Doctor Name' } },
  specialty: { name: 'Cardiologia' },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const mockMedicalRecordsRepository: jest.Mocked<IMedicalRecordsRepository> = {
  findById: jest.fn(),
  findByAppointment: jest.fn(),
  findByPatient: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByDoctorAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockValidate = { validate: jest.fn() } as unknown as jest.Mocked<ValidateRecordDataService>

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('UpdateMedicalRecordUseCase', () => {
  let useCase: UpdateMedicalRecordUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateMedicalRecordUseCase(
      {} as DataSource,
      mockMedicalRecordsRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockValidate,
      mockCache,
    )
    mockMedicalRecordsRepository.findById.mockResolvedValue(makeRecord() as any)
    mockAppointmentsRepository.findById.mockResolvedValue({ status: AppointmentStatus.SCHEDULED } as any)
    mockMedicalRecordsRepository.update.mockResolvedValue(makeRecord() as any)
    mockCache.delByPattern.mockResolvedValue(undefined)
  })

  it('updates the record for ADMIN', async () => {
    const dto = { notes: 'Updated notes' }
    const result = await useCase.execute(recordId, dto, adminUser)
    expect(result.appointmentId).toBe(appointmentId)
    expect(mockMedicalRecordsRepository.update).toHaveBeenCalled()
  })

  it('updates the record for DOCTOR (own record)', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    const dto = { notes: 'Doctor notes' }
    await useCase.execute(recordId, dto, doctorUser)
    expect(mockMedicalRecordsRepository.update).toHaveBeenCalled()
  })

  it('throws ForbiddenException when DOCTOR updates another doctor record', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)
    await expect(useCase.execute(recordId, {}, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws NotFoundException when record not found', async () => {
    mockMedicalRecordsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(recordId, {}, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws UnprocessableEntityException when appointment is completed', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue({ status: AppointmentStatus.COMPLETED } as any)
    await expect(useCase.execute(recordId, { data: {} }, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('validates data against snapshot when data is provided', async () => {
    const dto = { data: { notes_0ab1: 'text' } }
    await useCase.execute(recordId, dto, adminUser)
    expect(mockValidate.validate).toHaveBeenCalledWith(dto.data, makeSnapshot())
  })

  it('skips validation when data is not provided', async () => {
    await useCase.execute(recordId, { notes: 'only notes' }, adminUser)
    expect(mockValidate.validate).not.toHaveBeenCalled()
  })

  it('throws ConflictException on optimistic lock error', async () => {
    mockMedicalRecordsRepository.update.mockRejectedValue(
      new OptimisticLockVersionMismatchError('MedicalRecord', 1, 2),
    )
    await expect(useCase.execute(recordId, { data: {} }, adminUser)).rejects.toThrow(ConflictException)
  })

  it('re-throws non-optimistic-lock errors from update', async () => {
    const unexpectedError = new Error('Unexpected DB error')
    mockMedicalRecordsRepository.update.mockRejectedValue(unexpectedError)
    await expect(useCase.execute(recordId, { data: {} }, adminUser)).rejects.toThrow('Unexpected DB error')
  })

  it('invalidates cache after update', async () => {
    await useCase.execute(recordId, { notes: 'x' }, adminUser)
    expect(mockCache.delByPattern).toHaveBeenCalledWith(`medical_records:patient:${patientId}*`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCache.delByPattern.mockRejectedValue(new Error('cache error'))
    await expect(useCase.execute(recordId, { notes: 'x' }, adminUser)).resolves.toBeDefined()
  })
})
