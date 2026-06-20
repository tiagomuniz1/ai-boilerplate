import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { FindAppointmentByIdUseCase } from '../use-cases/find-appointment-by-id.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const doctorId = faker.string.uuid()
const otherDoctorId = faker.string.uuid()

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.DOCTOR, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
const userUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER, clinicId: CLINIC_ID }

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  doctorId,
  patientId: faker.string.uuid(),
  specialtyId: null,
  scheduleId: faker.string.uuid(),
  date: '2025-06-20',
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

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

function makeMockDataSource(): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ fullName: 'Test' }]),
  }
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

describe('FindAppointmentByIdUseCase', () => {
  let useCase: FindAppointmentByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAppointmentByIdUseCase(
      makeMockDataSource(),
      mockAppointmentsRepository,
      mockDoctorsRepository,
    )
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
  })

  it('throws NotFoundException when appointment not found', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), adminUser)).rejects.toThrow(NotFoundException)
  })

  it('ADMIN can view any appointment', async () => {
    const appointment = makeAppointment({ doctorId: otherDoctorId })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    const result = await useCase.execute(appointment.id, adminUser)
    expect(result.id).toBe(appointment.id)
  })

  it('USER can view any appointment', async () => {
    const appointment = makeAppointment({ doctorId: otherDoctorId })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    const result = await useCase.execute(appointment.id, userUser)
    expect(result.id).toBe(appointment.id)
  })

  it('DOCTOR can view own appointment', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    const result = await useCase.execute(appointment.id, doctorUser)
    expect(result.id).toBe(appointment.id)
  })

  it('DOCTOR throws ForbiddenException when viewing another doctor appointment', async () => {
    const appointment = makeAppointment({ doctorId: otherDoctorId })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('returns empty string for doctorName and patientName when no rows found in DB', async () => {
    const appointment = makeAppointment({ specialtyId: 'spec-x' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)

    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }
    const emptyDataSource = { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource

    const useCaseWithEmpty = new FindAppointmentByIdUseCase(
      emptyDataSource,
      mockAppointmentsRepository,
      mockDoctorsRepository,
    )

    const result = await useCaseWithEmpty.execute(appointment.id, adminUser)

    expect(result.doctorName).toBe('')
    expect(result.patientName).toBe('')
    expect(result.specialtyName).toBeNull()
  })

  it('resolves specialtyName when the appointment has a specialty', async () => {
    const appointment = makeAppointment({ specialtyId: 'spec-x' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)

    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ name: 'Cardiologia' }]),
    }
    const ds = { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource

    const useCaseWithSpecialty = new FindAppointmentByIdUseCase(
      ds,
      mockAppointmentsRepository,
      mockDoctorsRepository,
    )

    const result = await useCaseWithSpecialty.execute(appointment.id, adminUser)

    expect(result.specialtyId).toBe('spec-x')
    expect(result.specialtyName).toBe('Cardiologia')
  })
})
