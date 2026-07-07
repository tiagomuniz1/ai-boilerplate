import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalCertificateType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { DeleteMedicalCertificateUseCase } from '../use-cases/delete-medical-certificate.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const certificateId = 'cert-uuid'
const appointmentId = 'appt-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeCertificate = (overrides = {}) => ({
  id: certificateId,
  clinicId,
  appointmentId,
  patientId: 'patient-uuid',
  doctorId,
  issuedAt: new Date(),
  snapshot: {
    issuedAt: new Date().toISOString(),
    type: MedicalCertificateType.LEAVE,
    clinic: { name: 'Clinic', address: null, logoUrl: null },
    doctor: { name: 'Doctor', crmNumber: '12345/SP', rqe: null, specialtyName: null },
    patient: { name: 'Patient', documentNumber: '12345678900' },
    daysOff: 3,
    startDate: '2026-01-05',
    cidCode: null,
    attendanceDate: null,
    checkInTime: null,
    checkOutTime: null,
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
  findByCrm: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('DeleteMedicalCertificateUseCase', () => {
  let useCase: DeleteMedicalCertificateUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteMedicalCertificateUseCase(
      {} as DataSource,
      mockMedicalCertificatesRepository,
      mockDoctorsRepository,
      mockCacheService,
    )
    mockMedicalCertificatesRepository.findById.mockResolvedValue(makeCertificate() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    mockMedicalCertificatesRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('deletes certificate for ADMIN', async () => {
    await useCase.execute(certificateId, adminUser)

    expect(mockMedicalCertificatesRepository.delete).toHaveBeenCalledWith(certificateId)
    expect(mockDoctorsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('deletes certificate for DOCTOR on own certificate', async () => {
    await useCase.execute(certificateId, doctorUser)

    expect(mockMedicalCertificatesRepository.delete).toHaveBeenCalledWith(certificateId)
    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('invalidates appointment cache after delete', async () => {
    await useCase.execute(certificateId, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`medical-certificates:appointment:${appointmentId}`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(certificateId, adminUser)).resolves.toBeUndefined()
  })

  it('throws NotFoundException when certificate not found', async () => {
    mockMedicalCertificatesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(certificateId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR deletes another doctor certificate', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(certificateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(certificateId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('does not delete when RBAC fails', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(certificateId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockMedicalCertificatesRepository.delete).not.toHaveBeenCalled()
  })
})
