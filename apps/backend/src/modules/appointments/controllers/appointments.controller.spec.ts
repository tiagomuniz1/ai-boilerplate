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
import { GetReassignCandidatesUseCase } from '../use-cases/get-reassign-candidates.use-case'
import { ReassignAppointmentUseCase } from '../use-cases/reassign-appointment.use-case'
import { ListAppointmentsUseCase } from '../use-cases/list-appointments.use-case'
import { MarkAppointmentNoShowUseCase } from '../use-cases/mark-appointment-no-show.use-case'
import { PreviewRecurringAppointmentsUseCase } from '../use-cases/preview-recurring-appointments.use-case'
import { CreateRecurringAppointmentsUseCase } from '../use-cases/create-recurring-appointments.use-case'
import { FindAppointmentSeriesByIdUseCase } from '../use-cases/find-appointment-series-by-id.use-case'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateAppointmentUseCase>
const mockCancel = { execute: jest.fn() } as unknown as jest.Mocked<CancelAppointmentUseCase>
const mockComplete = { execute: jest.fn() } as unknown as jest.Mocked<CompleteAppointmentUseCase>
const mockConfirm = { execute: jest.fn() } as unknown as jest.Mocked<ConfirmAppointmentUseCase>
const mockNoShow = { execute: jest.fn() } as unknown as jest.Mocked<MarkAppointmentNoShowUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindAppointmentByIdUseCase>
const mockList = { execute: jest.fn() } as unknown as jest.Mocked<ListAppointmentsUseCase>
const mockGetAvailability = { execute: jest.fn() } as unknown as jest.Mocked<GetAvailabilityUseCase>
const mockGetReassignCandidates = { execute: jest.fn() } as unknown as jest.Mocked<GetReassignCandidatesUseCase>
const mockReassign = { execute: jest.fn() } as unknown as jest.Mocked<ReassignAppointmentUseCase>
const mockPreviewRecurring = { execute: jest.fn() } as unknown as jest.Mocked<PreviewRecurringAppointmentsUseCase>
const mockCreateRecurring = { execute: jest.fn() } as unknown as jest.Mocked<CreateRecurringAppointmentsUseCase>
const mockFindSeries = { execute: jest.fn() } as unknown as jest.Mocked<FindAppointmentSeriesByIdUseCase>

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
      mockGetReassignCandidates,
      mockPreviewRecurring,
      mockCreateRecurring,
      mockFindSeries,
      mockReassign,
    )
  })

  it('createRecurring delegates to CreateRecurringAppointmentsUseCase', async () => {
    const dto = {
      patientId: faker.string.uuid(),
      startTime: '08:00',
      recurrenceInterval: 'every_week',
      dates: ['2099-06-20', '2099-06-27'],
      occurrenceCount: 2,
    } as any
    const response = { seriesId: faker.string.uuid(), appointments: [] }
    mockCreateRecurring.execute.mockResolvedValue(response as any)

    const result = await controller.createRecurring(dto, adminUser)

    expect(mockCreateRecurring.execute).toHaveBeenCalledWith(dto, adminUser)
    expect(result).toBe(response)
  })

  it('findSeriesById delegates to FindAppointmentSeriesByIdUseCase', async () => {
    const seriesId = faker.string.uuid()
    const response = { id: seriesId, occurrences: [] }
    mockFindSeries.execute.mockResolvedValue(response as any)

    const result = await controller.findSeriesById(seriesId, adminUser)

    expect(mockFindSeries.execute).toHaveBeenCalledWith(seriesId, adminUser)
    expect(result).toBe(response)
  })

  it('previewRecurring delegates to PreviewRecurringAppointmentsUseCase', async () => {
    const query = {
      patientId: faker.string.uuid(),
      date: '2099-06-20',
      startTime: '08:00',
      recurrenceInterval: 'every_week',
      occurrenceCount: 4,
    } as any
    const response = { occurrences: [] }
    mockPreviewRecurring.execute.mockResolvedValue(response as any)

    const result = await controller.previewRecurring(query, adminUser)

    expect(mockPreviewRecurring.execute).toHaveBeenCalledWith(query, adminUser)
    expect(result).toBe(response)
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

  it('reassignCandidates delegates to GetReassignCandidatesUseCase', async () => {
    const id = faker.string.uuid()
    const response = [
      { professionalId: faker.string.uuid(), professionalName: 'Dr. Other', specialtyName: 'Cardiologia' },
    ]
    mockGetReassignCandidates.execute.mockResolvedValue(response as any)

    const result = await controller.reassignCandidates(id, adminUser)

    expect(mockGetReassignCandidates.execute).toHaveBeenCalledWith(id, adminUser)
    expect(result).toBe(response)
  })

  it('reassign delegates to ReassignAppointmentUseCase', async () => {
    const id = faker.string.uuid()
    const dto = { professionalId: faker.string.uuid() } as any
    const response = makeAppointmentResponse({ id })
    mockReassign.execute.mockResolvedValue(response as any)

    const result = await controller.reassign(id, dto, adminUser)

    expect(mockReassign.execute).toHaveBeenCalledWith(id, dto, adminUser)
    expect(result).toBe(response)
  })
})
