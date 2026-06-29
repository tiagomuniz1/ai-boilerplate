import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { FindPrescriptionByIdUseCase } from '../use-cases/find-prescription-by-id.use-case'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const prescriptionId = 'rx-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makePrescription = (overrides = {}) => ({
  id: prescriptionId,
  clinicId,
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  doctorId,
  issuedAt: new Date(),
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Clinic', address: null, logoUrl: null },
    doctor: { name: 'Doctor', crmNumber: '12345/SP', specialtyName: null },
    patient: { name: 'Patient', documentNumber: '12345678900' },
    items: [],
    notes: null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockPrescriptionsRepository: jest.Mocked<IPrescriptionsRepository> = {
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

describe('FindPrescriptionByIdUseCase', () => {
  let useCase: FindPrescriptionByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindPrescriptionByIdUseCase(
      {} as DataSource,
      mockPrescriptionsRepository,
      mockDoctorsRepository,
    )
    mockPrescriptionsRepository.findById.mockResolvedValue(makePrescription() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
  })

  it('returns prescription for ADMIN', async () => {
    const result = await useCase.execute(prescriptionId, adminUser)

    expect(result.id).toBe(prescriptionId)
    expect(mockDoctorsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns prescription for DOCTOR on own prescription', async () => {
    const result = await useCase.execute(prescriptionId, doctorUser)

    expect(result.id).toBe(prescriptionId)
    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('throws NotFoundException when prescription not found', async () => {
    mockPrescriptionsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(prescriptionId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR accesses another doctor prescription', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(prescriptionId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(prescriptionId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('maps snapshot fields to response DTO', async () => {
    const result = await useCase.execute(prescriptionId, adminUser)

    expect(result.patientName).toBe('Patient')
    expect(result.doctorName).toBe('Doctor')
    expect(result.notes).toBeNull()
  })
})
