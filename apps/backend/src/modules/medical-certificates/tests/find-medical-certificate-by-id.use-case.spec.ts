import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalCertificateType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { FindMedicalCertificateByIdUseCase } from '../use-cases/find-medical-certificate-by-id.use-case'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const certificateId = 'cert-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeCertificate = (overrides = {}) => ({
  id: certificateId,
  clinicId,
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  doctorId,
  issuedAt: new Date(),
  snapshot: {
    issuedAt: new Date().toISOString(),
    type: MedicalCertificateType.ATTENDANCE,
    clinic: { name: 'Clinic', address: null, logoUrl: null },
    doctor: { name: 'Doctor', crmNumber: '12345/SP', specialtyName: null },
    patient: { name: 'Patient', documentNumber: '12345678900' },
    daysOff: null,
    startDate: null,
    cidCode: null,
    attendanceDate: '2026-01-05',
    checkInTime: '08:00',
    checkOutTime: '08:30',
    observations: null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockMedicalCertificatesRepository: jest.Mocked<IMedicalCertificatesRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('FindMedicalCertificateByIdUseCase', () => {
  let useCase: FindMedicalCertificateByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindMedicalCertificateByIdUseCase(
      {} as DataSource,
      mockMedicalCertificatesRepository,
      mockDoctorsRepository,
    )
    mockMedicalCertificatesRepository.findById.mockResolvedValue(makeCertificate() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
  })

  it('returns certificate for ADMIN', async () => {
    const result = await useCase.execute(certificateId, adminUser)

    expect(result.id).toBe(certificateId)
    expect(mockDoctorsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns certificate for DOCTOR on own certificate', async () => {
    const result = await useCase.execute(certificateId, doctorUser)

    expect(result.id).toBe(certificateId)
    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('throws NotFoundException when certificate not found', async () => {
    mockMedicalCertificatesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(certificateId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR accesses another doctor certificate', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(certificateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(certificateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('maps snapshot fields to response DTO', async () => {
    const result = await useCase.execute(certificateId, adminUser)

    expect(result.patientName).toBe('Patient')
    expect(result.doctorName).toBe('Doctor')
    expect(result.type).toBe(MedicalCertificateType.ATTENDANCE)
    expect(result.attendanceDate).toBe('2026-01-05')
    expect(result.observations).toBeNull()
  })
})
