import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { FindMedicalRecordByIdUseCase } from '../use-cases/find-medical-record-by-id.use-case'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const recordId = 'record-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeRecord = (overrides = {}) => ({
  id: recordId,
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  doctorId,
  specialtyId: 'specialty-uuid',
  templateId: 'template-uuid',
  templateSchemaSnapshot: [],
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

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrm: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('FindMedicalRecordByIdUseCase', () => {
  let useCase: FindMedicalRecordByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindMedicalRecordByIdUseCase({} as DataSource, mockMedicalRecordsRepository, mockDoctorsRepository)
    mockMedicalRecordsRepository.findById.mockResolvedValue(makeRecord() as any)
  })

  it('returns record for ADMIN', async () => {
    const result = await useCase.execute(recordId, adminUser)
    expect(result.id).toBe(recordId)
    expect(result.patientName).toBe('Patient Name')
  })

  it('returns record for DOCTOR (own record)', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    const result = await useCase.execute(recordId, doctorUser)
    expect(result.id).toBe(recordId)
  })

  it('throws NotFoundException when record not found', async () => {
    mockMedicalRecordsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(recordId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws NotFoundException when DOCTOR accesses another doctor record', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)
    await expect(useCase.execute(recordId, doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('throws NotFoundException when DOCTOR has no profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(recordId, doctorUser)).rejects.toThrow(NotFoundException)
  })
})
