import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { AppointmentsController } from './appointments.controller'
import { CancelAppointmentUseCase } from '../use-cases/cancel-appointment.use-case'
import { CompleteAppointmentUseCase } from '../use-cases/complete-appointment.use-case'
import { ConfirmAppointmentUseCase } from '../use-cases/confirm-appointment.use-case'
import { CreateAppointmentUseCase } from '../use-cases/create-appointment.use-case'
import { FindAppointmentByIdUseCase } from '../use-cases/find-appointment-by-id.use-case'
import { GetAvailabilityUseCase } from '../use-cases/get-availability.use-case'
import { ListAppointmentsUseCase } from '../use-cases/list-appointments.use-case'
import { MarkAppointmentNoShowUseCase } from '../use-cases/mark-appointment-no-show.use-case'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateAppointmentUseCase>
const mockCancel = { execute: jest.fn() } as unknown as jest.Mocked<CancelAppointmentUseCase>
const mockComplete = { execute: jest.fn() } as unknown as jest.Mocked<CompleteAppointmentUseCase>
const mockConfirm = { execute: jest.fn() } as unknown as jest.Mocked<ConfirmAppointmentUseCase>
const mockNoShow = { execute: jest.fn() } as unknown as jest.Mocked<MarkAppointmentNoShowUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindAppointmentByIdUseCase>
const mockList = { execute: jest.fn() } as unknown as jest.Mocked<ListAppointmentsUseCase>
const mockGetAvailability = { execute: jest.fn() } as unknown as jest.Mocked<GetAvailabilityUseCase>

const CLINIC_ID = 'clinic-uuid'

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }

const makeAppointmentResponse = (overrides = {}) => ({
  id: faker.string.uuid(),
  professionalId: faker.string.uuid(),
  professionalName: 'Dr. Test',
  patientId: faker.string.uuid(),
  patientName: 'Patient Test',
  scheduleId: faker.string.uuid(),
  date: '2099-06-20',
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('AppointmentsController', () => {
  let controller: AppointmentsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new AppointmentsController(
      mockCreate,
      mockCancel,
      mockComplete,
      mockConfirm,
      mockNoShow,
      mockFindById,
      mockList,
      mockGetAvailability,
    )
  })

  it('create delegates to CreateAppointmentUseCase', async () => {
    const dto = { patientId: faker.string.uuid(), date: '2099-06-20', startTime: '08:00' } as any
    const response = makeAppointmentResponse()
    mockCreate.execute.mockResolvedValue(response as any)

    const result = await controller.create(dto, adminUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, adminUser)
    expect(result).toBe(response)
  })

  it('create delegates to CreateAppointmentUseCase for DOCTOR', async () => {
    const dto = { patientId: faker.string.uuid(), date: '2099-06-20', startTime: '08:00' } as any
    const response = makeAppointmentResponse()
    mockCreate.execute.mockResolvedValue(response as any)

    const result = await controller.create(dto, doctorUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, doctorUser)
    expect(result).toBe(response)
  })

  it('getAvailability delegates to GetAvailabilityUseCase', async () => {
    const query = { professionalId: faker.string.uuid(), date: '2099-06-20' } as any
    const response = { slots: [] } as any
    mockGetAvailability.execute.mockResolvedValue(response)

    const result = await controller.getAvailability(query, adminUser)

    expect(mockGetAvailability.execute).toHaveBeenCalledWith(query, adminUser)
    expect(result).toBe(response)
  })

  it('findAll delegates to ListAppointmentsUseCase', async () => {
    const query = { page: 1, limit: 20 } as any
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockList.execute.mockResolvedValue(response as any)

    const result = await controller.findAll(query, adminUser)

    expect(mockList.execute).toHaveBeenCalledWith(query, adminUser)
    expect(result).toBe(response)
  })

  it('findById delegates to FindAppointmentByIdUseCase', async () => {
    const id = faker.string.uuid()
    const response = makeAppointmentResponse({ id })
    mockFindById.execute.mockResolvedValue(response as any)

    const result = await controller.findById(id, adminUser)

    expect(mockFindById.execute).toHaveBeenCalledWith(id, adminUser)
    expect(result).toBe(response)
  })

  it('cancel delegates to CancelAppointmentUseCase', async () => {
    const id = faker.string.uuid()
    const dto = { cancellationReason: 'Patient request' } as any
    const response = makeAppointmentResponse({ id, status: AppointmentStatus.CANCELLED })
    mockCancel.execute.mockResolvedValue(response as any)

    const result = await controller.cancel(id, dto, adminUser)

    expect(mockCancel.execute).toHaveBeenCalledWith(id, dto, adminUser)
    expect(result).toBe(response)
  })

  it('complete delegates to CompleteAppointmentUseCase', async () => {
    const id = faker.string.uuid()
    const response = makeAppointmentResponse({ id, status: AppointmentStatus.COMPLETED })
    mockComplete.execute.mockResolvedValue(response as any)

    const result = await controller.complete(id, adminUser)

    expect(mockComplete.execute).toHaveBeenCalledWith(id, adminUser)
    expect(result).toBe(response)
  })

  it('confirm delegates to ConfirmAppointmentUseCase', async () => {
    const id = faker.string.uuid()
    const response = makeAppointmentResponse({ id, status: AppointmentStatus.CONFIRMED })
    mockConfirm.execute.mockResolvedValue(response as any)

    const result = await controller.confirm(id, adminUser)

    expect(mockConfirm.execute).toHaveBeenCalledWith(id, adminUser)
    expect(result).toBe(response)
  })

  it('noShow delegates to MarkAppointmentNoShowUseCase', async () => {
    const id = faker.string.uuid()
    const response = makeAppointmentResponse({ id, status: AppointmentStatus.NO_SHOW })
    mockNoShow.execute.mockResolvedValue(response as any)

    const result = await controller.noShow(id, adminUser)

    expect(mockNoShow.execute).toHaveBeenCalledWith(id, adminUser)
    expect(result).toBe(response)
  })
})
