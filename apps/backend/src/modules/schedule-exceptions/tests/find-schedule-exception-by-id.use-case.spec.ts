import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { FindScheduleExceptionByIdUseCase } from '../use-cases/find-schedule-exception-by-id.use-case'

const mockScheduleExceptionsRepository: jest.Mocked<IScheduleExceptionsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByDoctorAndDate: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
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

const CLINIC_ID = 'clinic-uuid'
const DOCTOR_ID = 'doctor-uuid'
const EXCEPTION_ID = 'exception-uuid'

const makeDoctor = (id = DOCTOR_ID) => ({ id } as any)

const makeException = (overrides = {}) => ({
  id: EXCEPTION_ID,
  clinicId: CLINIC_ID,
  doctorId: DOCTOR_ID,
  date: '2099-06-20',
  startTime: null,
  endTime: null,
  reason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('FindScheduleExceptionByIdUseCase', () => {
  let useCase: FindScheduleExceptionByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindScheduleExceptionByIdUseCase(
      {} as DataSource,
      mockScheduleExceptionsRepository,
      mockDoctorsRepository,
    )
  })

  it('throws NotFoundException when exception does not exist', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(EXCEPTION_ID, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('returns exception for ADMIN', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)
    const result = await useCase.execute(EXCEPTION_ID, adminUser)
    expect(result.id).toBe(EXCEPTION_ID)
  })

  it('returns own exception for DOCTOR', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    const result = await useCase.execute(EXCEPTION_ID, doctorUser)
    expect(result.id).toBe(EXCEPTION_ID)
  })

  it('throws ForbiddenException when DOCTOR views exception of another doctor', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException({ doctorId: 'other-doctor' }) as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(useCase.execute(EXCEPTION_ID, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(EXCEPTION_ID, doctorUser)).rejects.toThrow(ForbiddenException)
  })
})
