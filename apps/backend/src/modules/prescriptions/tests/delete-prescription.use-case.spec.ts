import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { DeletePrescriptionUseCase } from '../use-cases/delete-prescription.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const prescriptionId = 'rx-uuid'
const appointmentId = 'appt-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makePrescription = (overrides = {}) => ({
  id: prescriptionId,
  clinicId,
  appointmentId,
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
  countByClinic: jest.fn(),
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

describe('DeletePrescriptionUseCase', () => {
  let useCase: DeletePrescriptionUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeletePrescriptionUseCase(
      {} as DataSource,
      mockPrescriptionsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockPrescriptionsRepository.findById.mockResolvedValue(makePrescription() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockPrescriptionsRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('deletes prescription for ADMIN', async () => {
    await useCase.execute(prescriptionId, adminUser)

    expect(mockPrescriptionsRepository.delete).toHaveBeenCalledWith(prescriptionId)
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('deletes prescription for DOCTOR on own prescription', async () => {
    await useCase.execute(prescriptionId, doctorUser)

    expect(mockPrescriptionsRepository.delete).toHaveBeenCalledWith(prescriptionId)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('invalidates appointment cache after delete', async () => {
    await useCase.execute(prescriptionId, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`prescriptions:appointment:${appointmentId}`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(prescriptionId, adminUser)).resolves.toBeUndefined()
  })

  it('throws NotFoundException when prescription not found', async () => {
    mockPrescriptionsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(prescriptionId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR deletes another doctor prescription', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(prescriptionId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(prescriptionId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('does not delete when RBAC fails', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(prescriptionId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockPrescriptionsRepository.delete).not.toHaveBeenCalled()
  })
})
