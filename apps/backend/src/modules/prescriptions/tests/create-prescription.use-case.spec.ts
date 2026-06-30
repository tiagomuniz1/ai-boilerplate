import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IMedicationsRepository } from '../../medications/repositories/medications.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { CreatePrescriptionUseCase } from '../use-cases/create-prescription.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const patientId = 'patient-uuid'
const appointmentId = 'appt-uuid'
const medicationId = 'med-uuid'
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

const makeDoctor = (overrides = {}) => ({
  id: doctorId,
  user: { fullName: 'Doctor Smith' },
  crmNumber: '12345/SP',
  specialties: [{ id: specialtyId, name: 'Cardiologia' }],
  ...overrides,
})

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

const makeMedication = () => ({
  id: medicationId,
  name: 'Dipirona',
  activeIngredient: 'dipirona sódica',
})

const makeSavedPrescription = () => ({
  id: 'rx-uuid',
  clinicId,
  appointmentId,
  patientId,
  doctorId,
  issuedAt: new Date(),
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Test Clinic', address: null, logoUrl: null },
    doctor: { name: 'Doctor Smith', crmNumber: '12345/SP', specialtyName: 'Cardiologia' },
    patient: { name: 'Patient Jones', documentNumber: '12345678900' },
    items: [{ medicationId, name: 'Dipirona', activeIngredient: 'dipirona sódica', dosage: null, quantity: null, instructions: 'Tomar 1 cp a cada 6h' }],
    notes: null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const mockPrescriptionsRepository: jest.Mocked<IPrescriptionsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
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
  findByCrmNumber: jest.fn(),
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

const mockMedicationsRepository: jest.Mocked<IMedicationsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  bulkUpsert: jest.fn(),
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
  items: [{ medicationId, instructions: 'Tomar 1 cp a cada 6h' }],
}

describe('CreatePrescriptionUseCase', () => {
  let useCase: CreatePrescriptionUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreatePrescriptionUseCase(
      {} as DataSource,
      mockPrescriptionsRepository,
      mockAppointmentsRepository,
      mockDoctorsRepository,
      mockPatientsRepository,
      mockMedicationsRepository,
      mockFindClinicByIdUseCase,
      mockCacheService,
    )
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
    mockDoctorsRepository.findById.mockResolvedValue(makeDoctor() as any)
    mockPatientsRepository.findById.mockResolvedValue(makePatient() as any)
    mockMedicationsRepository.findById.mockResolvedValue(makeMedication() as any)
    ;(mockFindClinicByIdUseCase.execute as jest.Mock).mockResolvedValue(makeClinic())
    mockPrescriptionsRepository.create.mockResolvedValue(makeSavedPrescription() as any)
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('creates prescription for ADMIN and returns DTO', async () => {
    const result = await useCase.execute(baseDto, adminUser)

    expect(result.appointmentId).toBe(appointmentId)
    expect(result.patientName).toBe('Patient Jones')
    expect(result.doctorName).toBe('Doctor Smith')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Dipirona')
    expect(mockPrescriptionsRepository.create).toHaveBeenCalled()
  })

  it('creates prescription for DOCTOR in own appointment', async () => {
    const result = await useCase.execute(baseDto, doctorUser)

    expect(result.appointmentId).toBe(appointmentId)
    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(mockPrescriptionsRepository.create).toHaveBeenCalled()
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

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.clinic.name).toBe('Test Clinic')
    expect(createCall.snapshot.doctor.crmNumber).toBe('12345/SP')
    expect(createCall.snapshot.doctor.specialtyName).toBe('Cardiologia')
    expect(createCall.snapshot.patient.documentNumber).toBe('12345678900')
    expect(createCall.snapshot.items[0].name).toBe('Dipirona')
    expect(createCall.snapshot.items[0].activeIngredient).toBe('dipirona sódica')
  })

  it('propagates dosage from DTO to snapshot when provided', async () => {
    await useCase.execute({ ...baseDto, items: [{ medicationId, dosage: '500mg', instructions: 'Tomar 1 cp' }] }, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.items[0].dosage).toBe('500mg')
  })

  it('sets dosage to null in snapshot when not provided', async () => {
    await useCase.execute({ ...baseDto, items: [{ medicationId, instructions: 'Tomar 1 cp' }] }, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.items[0].dosage).toBeNull()
  })

  it('propagates quantity from DTO to snapshot when provided', async () => {
    await useCase.execute({ ...baseDto, items: [{ medicationId, quantity: '2 caixas', instructions: 'Tomar 1 cp' }] }, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.items[0].quantity).toBe('2 caixas')
  })

  it('sets quantity to null in snapshot when not provided', async () => {
    await useCase.execute({ ...baseDto, items: [{ medicationId, instructions: 'Tomar 1 cp' }] }, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.items[0].quantity).toBeNull()
  })

  it('returns dosage=null for old snapshots without the field', async () => {
    const oldPrescription = {
      ...makeSavedPrescription(),
      snapshot: {
        ...makeSavedPrescription().snapshot,
        items: [{ medicationId, name: 'Dipirona', activeIngredient: 'dipirona sódica', instructions: 'Tomar 1 cp' }],
      },
    }
    mockPrescriptionsRepository.create.mockResolvedValueOnce(oldPrescription as any)

    const result = await useCase.execute(baseDto, adminUser)

    expect(result.items[0].dosage).toBeNull()
  })

  it('sets specialtyName to null when appointment has no specialtyId', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)

    await useCase.execute(baseDto, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.doctor.specialtyName).toBeNull()
  })

  it('sets specialtyName to null when doctor has no matching specialty', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(makeDoctor({ specialties: [] }) as any)

    await useCase.execute(baseDto, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.doctor.specialtyName).toBeNull()
  })

  it('preserves notes in snapshot', async () => {
    await useCase.execute({ ...baseDto, notes: 'Retornar em 7 dias' }, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.notes).toBe('Retornar em 7 dias')
  })

  it('sets notes to null when omitted', async () => {
    await useCase.execute(baseDto, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.notes).toBeNull()
  })

  it('invalidates appointment cache after create', async () => {
    await useCase.execute(baseDto, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`prescriptions:appointment:${appointmentId}`)
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

  it('throws UnprocessableEntityException when medication not found', async () => {
    mockMedicationsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('builds snapshot item from activeIngredientName without DB lookup', async () => {
    const freeTextDto = {
      appointmentId,
      items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp 8/8h' }],
    }

    await useCase.execute(freeTextDto as any, adminUser)

    expect(mockMedicationsRepository.findById).not.toHaveBeenCalled()
    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.items[0]).toMatchObject({
      medicationId: null,
      name: 'Amoxicilina',
      activeIngredient: 'Amoxicilina',
    })
  })

  it('throws UnprocessableEntityException when item has neither medicationId nor activeIngredientName', async () => {
    const badDto = {
      appointmentId,
      items: [{ instructions: 'Tomar 1 cp' }],
    }

    await expect(useCase.execute(badDto as any, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws NotFoundException when doctor not found during snapshot', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws NotFoundException when patient not found', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseDto, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('sets address to null in snapshot when clinic has no address', async () => {
    mockFindClinicByIdUseCase.execute.mockResolvedValue({ ...makeClinic(), address: null } as any)

    const result = await useCase.execute(baseDto, adminUser)

    expect(result).toMatchObject({ appointmentId })
    const savedSnapshot = mockPrescriptionsRepository.create.mock.calls[0][0].snapshot
    expect(savedSnapshot.clinic.address).toBeNull()
  })
})
