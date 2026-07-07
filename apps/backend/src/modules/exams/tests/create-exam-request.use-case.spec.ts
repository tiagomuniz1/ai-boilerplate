import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus, ExamRequestStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { CreateExamRequestUseCase } from '../use-cases/create-exam-request.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const patientId = 'patient-uuid'
const appointmentId = 'appt-uuid'
const specialtyId = 'specialty-uuid'

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

const makeDoctor = (overrides: any = {}) => {
  const { specialties = [{ id: specialtyId, name: 'Cardiologia' }], ...rest } = overrides
  return {
    id: doctorId,
    user: { fullName: 'Doctor Smith' },
    crms: [{ id: 'crm-1', number: '12345', state: 'SP', isPrimary: true }],
    doctorSpecialties: specialties.map((s: any) => ({ specialtyId: s.id, specialty: { id: s.id, name: s.name } })),
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

const makeSavedExamRequest = () => ({
  id: 'exam-uuid',
  clinicId,
  appointmentId,
  patientId,
  doctorId,
  issuedAt: new Date(),
  status: ExamRequestStatus.REQUESTED,
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Test Clinic', address: null, logoUrl: null },
    doctor: { name: 'Doctor Smith', crmNumber: '12345/SP', rqe: null, specialtyName: 'Cardiologia' },
    patient: { name: 'Patient Jones', documentNumber: '12345678900' },
    items: [{ name: 'Hemograma', observations: 'Jejum de 8h' }],
    notes: null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const mockExamRequestsRepository: jest.Mocked<IExamRequestsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
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

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByDocumentNumber: jest.fn(),
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

const baseDto = {
  appointmentId,
  items: [{ name: 'Hemograma', observations: 'Jejum de 8h' }],
}

describe('CreateExamRequestUseCase', () => {
  let useCase: CreateExamRequestUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateExamRequestUseCase(
      {} as DataSource,
      mockExamRequestsRepository,
      mockAppointmentsRepository,
      mockDoctorsRepository,
      mockPatientsRepository,
      mockFindClinicByIdUseCase,
      mockCacheService,
    )
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
    mockDoctorsRepository.findById.mockResolvedValue(makeDoctor() as any)
    mockPatientsRepository.findById.mockResolvedValue(makePatient() as any)
    ;(mockFindClinicByIdUseCase.execute as jest.Mock).mockResolvedValue(makeClinic())
    mockExamRequestsRepository.create.mockResolvedValue(makeSavedExamRequest() as any)
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('creates exam request for ADMIN and returns DTO with status requested', async () => {
    const result = await useCase.execute(baseDto, adminUser)

    expect(result.appointmentId).toBe(appointmentId)
    expect(result.patientName).toBe('Patient Jones')
    expect(result.doctorName).toBe('Doctor Smith')
    expect(result.status).toBe(ExamRequestStatus.REQUESTED)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Hemograma')
    expect(result.results).toEqual([])
    expect(mockExamRequestsRepository.create).toHaveBeenCalled()
  })

  it('creates exam request with multiple items', async () => {
    const dto = {
      appointmentId,
      items: [
        { name: 'Hemograma', observations: 'Jejum de 8h' },
        { name: 'Raio-X tórax' },
      ],
    }
    mockExamRequestsRepository.create.mockResolvedValue({
      ...makeSavedExamRequest(),
      snapshot: {
        ...makeSavedExamRequest().snapshot,
        items: [
          { name: 'Hemograma', observations: 'Jejum de 8h' },
          { name: 'Raio-X tórax', observations: null },
        ],
      },
    } as any)

    const result = await useCase.execute(dto, adminUser)

    expect(result.items).toHaveLength(2)
  })

  it('creates exam request for DOCTOR in own appointment', async () => {
    const result = await useCase.execute(baseDto, doctorUser)

    expect(result.appointmentId).toBe(appointmentId)
    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(mockExamRequestsRepository.create).toHaveBeenCalled()
  })

  it('reuses DOCTOR from RBAC check when loading doctor for snapshot', async () => {
    await useCase.execute(baseDto, doctorUser)

    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledTimes(1)
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
  })

  it('loads doctor by ID for ADMIN (no RBAC check)', async () => {
    await useCase.execute(baseDto, adminUser)

    expect(mockDoctorsRepository.findByUserId).not.toHaveBeenCalled()
    expect(mockDoctorsRepository.findById).toHaveBeenCalledWith(doctorId, clinicId)
  })

  it('builds snapshot with denormalized clinic, doctor, patient, and items', async () => {
    await useCase.execute(baseDto, adminUser)

    const createCall = mockExamRequestsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.clinic.name).toBe('Test Clinic')
    expect(createCall.snapshot.doctor.crmNumber).toBe('12345/SP')
    expect(createCall.snapshot.doctor.specialtyName).toBe('Cardiologia')
    expect(createCall.snapshot.patient.documentNumber).toBe('12345678900')
    expect(createCall.snapshot.items[0].name).toBe('Hemograma')
    expect(createCall.snapshot.items[0].observations).toBe('Jejum de 8h')
  })

  it('sets item observations to null when not provided', async () => {
    await useCase.execute({ appointmentId, items: [{ name: 'Hemograma' }] }, adminUser)

    const createCall = mockExamRequestsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.items[0].observations).toBeNull()
  })

  it('preserves notes in snapshot', async () => {
    await useCase.execute({ ...baseDto, notes: 'Paciente com histórico de alergia a contraste' }, adminUser)

    const createCall = mockExamRequestsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.notes).toBe('Paciente com histórico de alergia a contraste')
  })

  it('sets notes to null when omitted', async () => {
    await useCase.execute(baseDto, adminUser)

    const createCall = mockExamRequestsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.notes).toBeNull()
  })

  it('derives patientId and doctorId from the appointment, not the DTO', async () => {
    await useCase.execute(baseDto, adminUser)

    const createCall = mockExamRequestsRepository.create.mock.calls[0][0]
    expect(createCall.patientId).toBe(patientId)
    expect(createCall.doctorId).toBe(doctorId)
  })

  it('invalidates appointment cache after create', async () => {
    await useCase.execute(baseDto, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`exam-requests:appointment:${appointmentId}`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(baseDto, adminUser)).resolves.toBeDefined()
  })

  it('throws NotFoundException when appointment not found', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR tries to create for another doctor appointment', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor({ id: 'other-doctor' }) as any)

    await expect(useCase.execute(baseDto, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws UnprocessableEntityException when appointment is cancelled', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ status: AppointmentStatus.CANCELLED }) as any)

    await expect(useCase.execute(baseDto, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws NotFoundException when doctor not found during snapshot', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws NotFoundException when patient not found', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('sets specialtyName to null when appointment has no specialtyId', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)

    await useCase.execute(baseDto, adminUser)

    const createCall = mockExamRequestsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.doctor.specialtyName).toBeNull()
  })

  it('sets specialtyName to null when doctor has no matching specialty', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(makeDoctor({ specialties: [] }) as any)

    await useCase.execute(baseDto, adminUser)

    const createCall = mockExamRequestsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.doctor.specialtyName).toBeNull()
  })

  it('sets address to null in snapshot when clinic has no address', async () => {
    mockFindClinicByIdUseCase.execute.mockResolvedValue({ ...makeClinic(), address: null } as any)

    const result = await useCase.execute(baseDto, adminUser)

    expect(result).toMatchObject({ appointmentId })
    const savedSnapshot = mockExamRequestsRepository.create.mock.calls[0][0].snapshot
    expect(savedSnapshot.clinic.address).toBeNull()
  })
})
