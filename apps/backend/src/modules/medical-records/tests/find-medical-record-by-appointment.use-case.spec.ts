import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { FindMedicalRecordByAppointmentUseCase } from '../use-cases/find-medical-record-by-appointment.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const appointmentId = 'appt-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeAppointment = (overrides = {}) => ({
  id: appointmentId,
  professionalId,
  status: AppointmentStatus.SCHEDULED,
  ...overrides,
})

const makeRecord = () => ({
  id: 'record-uuid',
  appointmentId,
  patientId: 'patient-uuid',
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

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  findActiveByDatesAndTime: jest.fn(),
  findBySeriesId: jest.fn(),
  findBySeriesIdFromDate: jest.fn(),
  countBySeriesIdAfterDate: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  hasFutureByProfessionalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
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

describe('FindMedicalRecordByAppointmentUseCase', () => {
  let useCase: FindMedicalRecordByAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindMedicalRecordByAppointmentUseCase(
      {} as DataSource,
      mockMedicalRecordsRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
    )
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockMedicalRecordsRepository.findByAppointment.mockResolvedValue(makeRecord() as any)
  })

  it('returns record for ADMIN', async () => {
    const result = await useCase.execute(appointmentId, adminUser)
    expect(result).not.toBeNull()
    expect(result!.appointmentId).toBe(appointmentId)
  })

  it('returns record for DOCTOR (own appointment)', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    const result = await useCase.execute(appointmentId, doctorUser)
    expect(result).not.toBeNull()
  })

  it('returns null when no record exists for appointment', async () => {
    mockMedicalRecordsRepository.findByAppointment.mockResolvedValue(null)
    const result = await useCase.execute(appointmentId, adminUser)
    expect(result).toBeNull()
  })

  it('throws NotFoundException when appointment not found', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(appointmentId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR checks another doctor appointment', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)
    await expect(useCase.execute(appointmentId, doctorUser)).rejects.toThrow(ForbiddenException)
  })
})
