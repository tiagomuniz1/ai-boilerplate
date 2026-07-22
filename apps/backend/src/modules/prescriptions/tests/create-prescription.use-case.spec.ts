import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, AppointmentStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IMedicationsRepository } from '../../medications/repositories/medications.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { CreatePrescriptionUseCase } from '../use-cases/create-prescription.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const patientId = 'patient-uuid'
const appointmentId = 'appt-uuid'
const medicationId = 'med-uuid'
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
  professionalId,
  issuedAt: new Date(),
  verificationToken: 'a'.repeat(64),
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Test Clinic', address: null, logoUrl: null },
    professional: { name: 'Doctor Smith', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: 'Cardiologia' },
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
  findByVerificationToken: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
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
      mockProfessionalsRepository,
      mockPatientsRepository,
      mockMedicationsRepository,
      mockFindClinicByIdUseCase,
      mockCacheService,
    )
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
    mockProfessionalsRepository.findById.mockResolvedValue(makeDoctor() as any)
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
    expect(result.professionalName).toBe('Doctor Smith')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Dipirona')
    expect(mockPrescriptionsRepository.create).toHaveBeenCalled()
  })

  it('creates prescription for DOCTOR in own appointment', async () => {
    const result = await useCase.execute(baseDto, doctorUser)

    expect(result.appointmentId).toBe(appointmentId)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
    expect(mockPrescriptionsRepository.create).toHaveBeenCalled()
  })

  it('reuses DOCTOR from RBAC check when loading doctor for snapshot', async () => {
    await useCase.execute(baseDto, doctorUser)

    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledTimes(1)
    expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
  })

  it('loads doctor by ID for ADMIN (no RBAC check)', async () => {
    await useCase.execute(baseDto, adminUser)

    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
    expect(mockProfessionalsRepository.findById).toHaveBeenCalledWith(professionalId, clinicId)
  })

  it('builds snapshot with denormalized clinic, doctor, patient, and items', async () => {
    await useCase.execute(baseDto, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.clinic.name).toBe('Test Clinic')
    expect(createCall.snapshot.professional.registrationNumber).toBe('12345/SP')
    expect(createCall.snapshot.professional.specialtyName).toBe('Cardiologia')
    expect(createCall.snapshot.patient.documentNumber).toBe('12345678900')
    expect(createCall.snapshot.items[0].name).toBe('Dipirona')
    expect(createCall.snapshot.items[0].activeIngredient).toBe('dipirona sódica')
  })

  it('signs with the chosen CRM and specialty (alternate RQE and profession title) when registrationId/specialtyId are provided', async () => {
    const altSpecialtyId = 'specialty-alt'
    const doctorWithOptions = {
      id: professionalId,
      user: { fullName: 'Doctor Smith' },
      registrations: [
        { id: 'crm-1', number: '12345', state: 'SP', isPrimary: true },
        { id: 'crm-2', number: '67890', state: 'RJ', isPrimary: false },
      ],
      professionalSpecialties: [
        { specialtyId, registryNumber: '111', specialty: { id: specialtyId, name: 'Cardiologia', titleName: null } },
        { specialtyId: altSpecialtyId, registryNumber: '222', specialty: { id: altSpecialtyId, name: 'Mastologia', titleName: 'mastologista' } },
      ],
    }
    mockProfessionalsRepository.findById.mockResolvedValue(doctorWithOptions as any)

    await useCase.execute({ ...baseDto, registrationId: 'crm-2', specialtyId: altSpecialtyId }, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.professional.registrationNumber).toBe('67890/RJ')
    expect(createCall.snapshot.professional.registryNumber).toBe('222')
    expect(createCall.snapshot.professional.specialtyName).toBe('mastologista')
  })

  it('signs with the professional council type for a non-CRM generalist professional (no specialty)', async () => {
    const nutritionistId = 'nutritionist-uuid'
    const nutritionist = {
      id: nutritionistId,
      user: { fullName: 'Nutri Ana' },
      registrations: [{ id: 'crn-1', number: '9876', state: 'SP', councilType: CouncilType.CRN, isPrimary: true }],
      professionalSpecialties: [],
    }
    mockAppointmentsRepository.findById.mockResolvedValue(
      makeAppointment({ professionalId: nutritionistId, specialtyId: null }) as any,
    )
    mockProfessionalsRepository.findById.mockResolvedValue(nutritionist as any)

    await useCase.execute(baseDto, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.professionalId).toBe(nutritionistId)
    expect(createCall.snapshot.professional.councilType).toBe(CouncilType.CRN)
    expect(createCall.snapshot.professional.registrationNumber).toBe('9876/SP')
    expect(createCall.snapshot.professional.specialtyName).toBeNull()
    expect(createCall.snapshot.professional.registryNumber).toBeNull()
  })

  it('rejects an unknown specialtyId that does not belong to the doctor', async () => {
    await expect(
      useCase.execute({ ...baseDto, specialtyId: 'not-my-specialty' }, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
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
    expect(createCall.snapshot.professional.specialtyName).toBeNull()
  })

  it('sets specialtyName to null when doctor has no matching specialty', async () => {
    mockProfessionalsRepository.findById.mockResolvedValue(makeDoctor({ specialties: [] }) as any)

    await useCase.execute(baseDto, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.snapshot.professional.specialtyName).toBeNull()
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

  it('generates a unique verification token and passes it to create', async () => {
    await useCase.execute(baseDto, adminUser)

    const createCall = mockPrescriptionsRepository.create.mock.calls[0][0]
    expect(createCall.verificationToken).toMatch(/^[a-f0-9]{64}$/)
  })

  it('generates a different verification token on each create', async () => {
    await useCase.execute(baseDto, adminUser)
    await useCase.execute(baseDto, adminUser)

    const first = mockPrescriptionsRepository.create.mock.calls[0][0].verificationToken
    const second = mockPrescriptionsRepository.create.mock.calls[1][0].verificationToken
    expect(first).not.toBe(second)
  })

  it('does not expose the verification token in the response DTO', async () => {
    const result = await useCase.execute(baseDto, adminUser)

    expect(result).not.toHaveProperty('verificationToken')
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
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor({ id: 'other-doctor' }) as any)

    await expect(useCase.execute(baseDto, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

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
    mockProfessionalsRepository.findById.mockResolvedValue(null)

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
