import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { FindPrescriptionsByAppointmentUseCase } from '../use-cases/find-prescriptions-by-appointment.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const appointmentId = 'appt-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makePrescription = () => ({
  id: 'rx-uuid',
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
})

const mockPrescriptionsRepository: jest.Mocked<IPrescriptionsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  findByVerificationToken: jest.fn(),
  create: jest.fn(),
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

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('FindPrescriptionsByAppointmentUseCase', () => {
  let useCase: FindPrescriptionsByAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindPrescriptionsByAppointmentUseCase(
      {} as DataSource,
      mockPrescriptionsRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockPrescriptionsRepository.findByAppointment.mockResolvedValue([makePrescription() as any])
    mockAppointmentsRepository.findById.mockResolvedValue({ id: appointmentId, professionalId } as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('returns prescriptions for ADMIN without RBAC check', async () => {
    const result = await useCase.execute(appointmentId, adminUser)

    expect(result).toHaveLength(1)
    expect(result[0].appointmentId).toBe(appointmentId)
    expect(mockAppointmentsRepository.findById).not.toHaveBeenCalled()
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns prescriptions for DOCTOR on own appointment', async () => {
    const result = await useCase.execute(appointmentId, doctorUser)

    expect(result).toHaveLength(1)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('returns cached result on cache hit', async () => {
    const cached = [{ id: 'cached-rx' }]
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(appointmentId, adminUser)

    expect(result).toBe(cached)
    expect(mockPrescriptionsRepository.findByAppointment).not.toHaveBeenCalled()
  })

  it('caches result on cache miss', async () => {
    await useCase.execute(appointmentId, adminUser)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      `prescriptions:appointment:${appointmentId}`,
      expect.any(Array),
      60,
    )
  })

  it('throws NotFoundException when DOCTOR accesses non-existent appointment', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR accesses another doctor appointment', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(appointmentId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('does not throw when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(appointmentId, adminUser)).resolves.toBeDefined()
  })

  it('does not throw when cache write fails', async () => {
    mockCacheService.set.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(appointmentId, adminUser)).resolves.toBeDefined()
  })
})
