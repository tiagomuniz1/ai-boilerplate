import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, AppointmentStatus, MedicalCertificateType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { CreateMedicalCertificateUseCase } from '../use-cases/create-medical-certificate.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const patientId = 'patient-uuid'
const appointmentId = 'appt-uuid'
const specialtyId = 'specialty-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeAppointment = (overrides = {}) => ({
  id: appointmentId,
  clinicId,
  professionalId,
  patientId,
  specialtyId,
  status: AppointmentStatus.SCHEDULED,
  ...overrides,
})

const makeDoctor = (overrides: any = {}) => {
  const { specialties = [{ id: specialtyId, name: 'Cardiologia' }], ...rest } = overrides
  return {
    id: professionalId,
    user: { fullName: 'Doctor Smith' },
    registrations: [{ id: 'crm-1', number: '12345', state: 'SP', councilType: CouncilType.CRM, isPrimary: true }],
    professionalSpecialties: specialties.map((s: any) => ({ specialtyId: s.id, specialty: { id: s.id, name: s.name } })),
    ...rest,
  }
}

const makePatient = () => ({
  id: patientId,
  user: { fullName: 'Patient Jones' },
  documentNumber: '12345678900',
})

const makeClinic = () => ({
  id: clinicId,
  name: 'Test Clinic',
  address: {
    street: 'Av Paulista',
    number: '1000',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    country: 'BR',
  },
  logoUrl: 'https://example.com/logo.png',
})

const makeSavedCertificate = (overrides = {}) => ({
  id: 'cert-uuid',
  clinicId,
  appointmentId,
  patientId,
  professionalId,
  issuedAt: new Date(),
  snapshot: {
    issuedAt: new Date().toISOString(),
    type: MedicalCertificateType.LEAVE,
    clinic: { name: 'Test Clinic', address: null, logoUrl: null },
    professional: { name: 'Doctor Smith', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: 'Cardiologia' },
    patient: { name: 'Patient Jones', documentNumber: '12345678900' },
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

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
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

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByDocumentNumber: jest.fn(),
  findActiveDependents: jest.fn(),
  findResponsiblePatientsByIds: jest.fn(),
  findDependentsByResponsibleIds: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockFindClinicByIdUseCase = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicByIdUseCase>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const leaveDto = {
  appointmentId,
  type: MedicalCertificateType.LEAVE,
  daysOff: 3,
  startDate: '2026-01-05',
}

const attendanceDto = {
  appointmentId,
  type: MedicalCertificateType.ATTENDANCE,
  attendanceDate: '2026-01-05',
  checkInTime: '08:00',
  checkOutTime: '08:30',
}

describe('CreateMedicalCertificateUseCase', () => {
  let useCase: CreateMedicalCertificateUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateMedicalCertificateUseCase(
      {} as DataSource,
      mockMedicalCertificatesRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockPatientsRepository,
      mockFindClinicByIdUseCase,
      mockCacheService,
    )
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
    mockProfessionalsRepository.findById.mockResolvedValue(makeDoctor() as any)
    mockPatientsRepository.findById.mockResolvedValue(makePatient() as any)
    ;(mockFindClinicByIdUseCase.execute as jest.Mock).mockResolvedValue(makeClinic())
    mockMedicalCertificatesRepository.create.mockResolvedValue(makeSavedCertificate() as any)
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('creates LEAVE certificate for ADMIN and returns DTO', async () => {
    const result = await useCase.execute(leaveDto as any, adminUser)

    expect(result.appointmentId).toBe(appointmentId)
    expect(result.patientName).toBe('Patient Jones')
    expect(result.professionalName).toBe('Doctor Smith')
    expect(mockMedicalCertificatesRepository.create).toHaveBeenCalled()
  })

  it('creates certificate for DOCTOR in own appointment', async () => {
    const result = await useCase.execute(leaveDto as any, doctorUser)

    expect(result.appointmentId).toBe(appointmentId)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(mockMedicalCertificatesRepository.create).toHaveBeenCalled()
  })

  it('reuses DOCTOR from RBAC check when loading doctor for snapshot', async () => {
    await useCase.execute(leaveDto as any, doctorUser)

    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledTimes(1)
    expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
  })

  it('loads doctor by ID for ADMIN (no RBAC check)', async () => {
    await useCase.execute(leaveDto as any, adminUser)

    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
    expect(mockProfessionalsRepository.findById).toHaveBeenCalledWith(professionalId, clinicId)
  })

  it('signs with the professional council type for a non-CRM generalist professional (no specialty)', async () => {
    const speechTherapistId = 'speech-therapist-uuid'
    const speechTherapist = {
      id: speechTherapistId,
      user: { fullName: 'Fono Carla' },
      registrations: [{ id: 'crfa-1', number: '4321', state: 'SP', councilType: CouncilType.CRFA, isPrimary: true }],
      professionalSpecialties: [],
    }
    mockAppointmentsRepository.findById.mockResolvedValue(
      makeAppointment({ professionalId: speechTherapistId, specialtyId: null }) as any,
    )
    mockProfessionalsRepository.findById.mockResolvedValue(speechTherapist as any)

    await useCase.execute(attendanceDto as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.professionalId).toBe(speechTherapistId)
    expect(createCall.snapshot.professional.councilType).toBe(CouncilType.CRFA)
    expect(createCall.snapshot.professional.registrationNumber).toBe('4321/SP')
    expect(createCall.snapshot.professional.specialtyName).toBeNull()
    expect(createCall.snapshot.professional.registryNumber).toBeNull()
  })

  it('builds snapshot with LEAVE fields and null ATTENDANCE fields', async () => {
    await useCase.execute(leaveDto as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.type).toBe(MedicalCertificateType.LEAVE)
    expect(createCall.snapshot.daysOff).toBe(3)
    expect(createCall.snapshot.startDate).toBe('2026-01-05')
    expect(createCall.snapshot.cidCode).toBeNull()
    expect(createCall.snapshot.attendanceDate).toBeNull()
    expect(createCall.snapshot.checkInTime).toBeNull()
    expect(createCall.snapshot.checkOutTime).toBeNull()
  })

  it('builds snapshot with ATTENDANCE fields and null LEAVE fields', async () => {
    await useCase.execute(attendanceDto as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.type).toBe(MedicalCertificateType.ATTENDANCE)
    expect(createCall.snapshot.attendanceDate).toBe('2026-01-05')
    expect(createCall.snapshot.checkInTime).toBe('08:00')
    expect(createCall.snapshot.checkOutTime).toBe('08:30')
    expect(createCall.snapshot.daysOff).toBeNull()
    expect(createCall.snapshot.startDate).toBeNull()
    expect(createCall.snapshot.cidCode).toBeNull()
  })

  it('propagates cidCode from DTO to snapshot when provided (LEAVE)', async () => {
    await useCase.execute({ ...leaveDto, cidCode: 'M54.5' } as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.cidCode).toBe('M54.5')
  })

  it('sets cidCode to null when not provided (LEAVE)', async () => {
    await useCase.execute(leaveDto as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.cidCode).toBeNull()
  })

  it('builds snapshot with denormalized clinic, doctor, and patient', async () => {
    await useCase.execute(leaveDto as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.clinic.name).toBe('Test Clinic')
    expect(createCall.snapshot.professional.registrationNumber).toBe('12345/SP')
    expect(createCall.snapshot.professional.specialtyName).toBe('Cardiologia')
    expect(createCall.snapshot.patient.documentNumber).toBe('12345678900')
  })

  it('sets specialtyName to null when appointment has no specialtyId', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)

    await useCase.execute(leaveDto as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.professional.specialtyName).toBeNull()
  })

  it('sets specialtyName to null when doctor has no matching specialty', async () => {
    mockProfessionalsRepository.findById.mockResolvedValue(makeDoctor({ specialties: [] }) as any)

    await useCase.execute(leaveDto as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.professional.specialtyName).toBeNull()
  })

  it('preserves observations in snapshot', async () => {
    await useCase.execute({ ...leaveDto, observations: 'Repouso absoluto' } as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.observations).toBe('Repouso absoluto')
  })

  it('sets observations to null when omitted', async () => {
    await useCase.execute(leaveDto as any, adminUser)

    const createCall = mockMedicalCertificatesRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.observations).toBeNull()
  })

  it('invalidates appointment cache after create', async () => {
    await useCase.execute(leaveDto as any, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`medical-certificates:appointment:${appointmentId}`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(leaveDto as any, adminUser)).resolves.toBeDefined()
  })

  it('throws NotFoundException when appointment not found', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(leaveDto as any, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR tries to create for another doctor appointment', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor({ id: 'other-doctor' }) as any)

    await expect(useCase.execute(leaveDto as any, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(leaveDto as any, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws UnprocessableEntityException when appointment is cancelled', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ status: AppointmentStatus.CANCELLED }) as any)

    await expect(useCase.execute(leaveDto as any, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws NotFoundException when doctor not found during snapshot', async () => {
    mockProfessionalsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(leaveDto as any, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws NotFoundException when patient not found', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(leaveDto as any, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('sets address to null in snapshot when clinic has no address', async () => {
    mockFindClinicByIdUseCase.execute.mockResolvedValue({ ...makeClinic(), address: null } as any)

    const result = await useCase.execute(leaveDto as any, adminUser)

    expect(result).toMatchObject({ appointmentId })
    const savedSnapshot = mockMedicalCertificatesRepository.create.mock.calls[0][0].snapshot
    expect(savedSnapshot.clinic.address).toBeNull()
  })
})
