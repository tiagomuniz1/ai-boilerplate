import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus, MedicalRecordFieldType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { FindTemplateByClinicAndSpecialtyUseCase } from '../../medical-record-templates/use-cases/find-template-by-clinic-and-specialty.use-case'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { ValidateRecordDataService } from '../services/validate-record-data.service'
import { CreateMedicalRecordUseCase } from '../use-cases/create-medical-record.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const patientId = 'patient-uuid'
const specialtyId = 'specialty-uuid'
const templateId = 'template-uuid'
const appointmentId = 'appt-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeAppointment = (overrides = {}) => ({
  id: appointmentId,
  clinicId,
  doctorId,
  patientId,
  specialtyId,
  status: AppointmentStatus.SCHEDULED,
  ...overrides,
})

const makeTemplate = (overrides = {}) => ({
  id: templateId,
  specialtyId,
  clinicId,
  fields: [
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
  ],
  ...overrides,
})

const makeRecord = () => ({
  id: 'record-uuid',
  appointmentId,
  patientId,
  doctorId,
  specialtyId,
  templateId,
  templateSchemaSnapshot: makeTemplate().fields,
  data: {},
  notes: null,
  patient: { user: { fullName: 'Patient Name' } },
  doctor: { user: { fullName: 'Doctor Name' } },
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

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByDoctorAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrm: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockFindTemplate = { execute: jest.fn() } as unknown as jest.Mocked<FindTemplateByClinicAndSpecialtyUseCase>

const mockValidate = { validate: jest.fn() } as unknown as jest.Mocked<ValidateRecordDataService>

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('CreateMedicalRecordUseCase', () => {
  let useCase: CreateMedicalRecordUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateMedicalRecordUseCase(
      {} as DataSource,
      mockMedicalRecordsRepository,
      mockAppointmentsRepository,
      mockDoctorsRepository,
      mockFindTemplate,
      mockValidate,
      mockCache,
    )
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(makeTemplate())
    mockMedicalRecordsRepository.findByAppointment.mockResolvedValue(null)
    mockMedicalRecordsRepository.create.mockResolvedValue(makeRecord() as any)
    mockCache.delByPattern.mockResolvedValue(undefined)
  })

  it('creates a medical record for ADMIN', async () => {
    const dto = { appointmentId, data: {}, notes: undefined }
    const result = await useCase.execute(dto, adminUser)
    expect(result.appointmentId).toBe(appointmentId)
    expect(result.patientName).toBe('Patient Name')
    expect(result.doctorName).toBe('Doctor Name')
    expect(result.specialtyName).toBe('Cardiologia')
    expect(mockMedicalRecordsRepository.create).toHaveBeenCalled()
  })

  it('creates a medical record for DOCTOR (own appointment)', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    const dto = { appointmentId, data: {} }
    await useCase.execute(dto, doctorUser)
    expect(mockMedicalRecordsRepository.create).toHaveBeenCalled()
  })

  it('throws ForbiddenException when DOCTOR creates for another doctor appointment', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)
    await expect(useCase.execute({ appointmentId, data: {} }, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws NotFoundException when appointment not found', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute({ appointmentId, data: {} }, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws UnprocessableEntityException when appointment has no specialtyId', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    await expect(useCase.execute({ appointmentId, data: {} }, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws NotFoundException when template not found', async () => {
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(null)
    await expect(useCase.execute({ appointmentId, data: {} }, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws UnprocessableEntityException when template specialty mismatches', async () => {
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(makeTemplate({ specialtyId: 'other-specialty' }))
    await expect(useCase.execute({ appointmentId, data: {} }, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws ConflictException when record already exists', async () => {
    mockMedicalRecordsRepository.findByAppointment.mockResolvedValue(makeRecord() as any)
    await expect(useCase.execute({ appointmentId, data: {} }, adminUser)).rejects.toThrow(ConflictException)
  })

  it('invalidates patient cache on create', async () => {
    await useCase.execute({ appointmentId, data: {} }, adminUser)
    expect(mockCache.delByPattern).toHaveBeenCalledWith(`medical_records:patient:${patientId}*`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCache.delByPattern.mockRejectedValue(new Error('redis error'))
    await expect(useCase.execute({ appointmentId, data: {} }, adminUser)).resolves.toBeDefined()
  })
})
