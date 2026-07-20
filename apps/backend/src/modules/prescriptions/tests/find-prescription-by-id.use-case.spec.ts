import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { FindPrescriptionByIdUseCase } from '../use-cases/find-prescription-by-id.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const prescriptionId = 'rx-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makePrescription = (overrides = {}) => ({
  id: prescriptionId,
  clinicId,
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  professionalId,
  issuedAt: new Date(),
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Clinic', address: null, logoUrl: null },
    professional: { name: 'Doctor', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: null },
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
  findByVerificationToken: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
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

describe('FindPrescriptionByIdUseCase', () => {
  let useCase: FindPrescriptionByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindPrescriptionByIdUseCase(
      {} as DataSource,
      mockPrescriptionsRepository,
      mockProfessionalsRepository,
    )
    mockPrescriptionsRepository.findById.mockResolvedValue(makePrescription() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
  })

  it('returns prescription for ADMIN', async () => {
    const result = await useCase.execute(prescriptionId, adminUser)

    expect(result.id).toBe(prescriptionId)
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns prescription for DOCTOR on own prescription', async () => {
    const result = await useCase.execute(prescriptionId, doctorUser)

    expect(result.id).toBe(prescriptionId)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('throws NotFoundException when prescription not found', async () => {
    mockPrescriptionsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(prescriptionId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR accesses another doctor prescription', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(prescriptionId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(prescriptionId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('maps snapshot fields to response DTO', async () => {
    const result = await useCase.execute(prescriptionId, adminUser)

    expect(result.patientName).toBe('Patient')
    expect(result.professionalName).toBe('Doctor')
    expect(result.notes).toBeNull()
  })
})
