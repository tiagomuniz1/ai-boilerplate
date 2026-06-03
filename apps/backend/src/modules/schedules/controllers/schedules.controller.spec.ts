import { faker } from '@faker-js/faker'
import { DayOfWeek, UserRole } from '@app/shared'
import { SchedulesController } from './schedules.controller'
import { CreateScheduleUseCase } from '../use-cases/create-schedule.use-case'
import { UpdateScheduleUseCase } from '../use-cases/update-schedule.use-case'
import { DeleteScheduleUseCase } from '../use-cases/delete-schedule.use-case'
import { FindScheduleByIdUseCase } from '../use-cases/find-schedule-by-id.use-case'
import { ListSchedulesUseCase } from '../use-cases/list-schedules.use-case'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateScheduleUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateScheduleUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteScheduleUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindScheduleByIdUseCase>
const mockList = { execute: jest.fn() } as unknown as jest.Mocked<ListSchedulesUseCase>

const currentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR }

const makeScheduleResponse = (overrides = {}) => ({
  id: faker.string.uuid(),
  doctorId: faker.string.uuid(),
  doctorName: 'Dr. Test Doctor',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('SchedulesController', () => {
  let controller: SchedulesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new SchedulesController(mockCreate, mockUpdate, mockDelete, mockFindById, mockList)
  })

  it('create delegates to CreateScheduleUseCase with dto and currentUser', async () => {
    const dto = {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
    } as any
    const response = makeScheduleResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto, currentUser as any)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findAll delegates to ListSchedulesUseCase with query and currentUser', async () => {
    const query: ListSchedulesQueryDto = { page: 1, limit: 20 }
    const response = { data: [makeScheduleResponse()], total: 1, page: 1, limit: 20 }
    mockList.execute.mockResolvedValue(response)

    const result = await controller.findAll(query, currentUser as any)

    expect(mockList.execute).toHaveBeenCalledWith(query, currentUser)
    expect(result).toBe(response)
  })

  it('findById delegates to FindScheduleByIdUseCase with id and currentUser', async () => {
    const id = faker.string.uuid()
    const response = makeScheduleResponse({ id })
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById(id, currentUser as any)

    expect(mockFindById.execute).toHaveBeenCalledWith(id, currentUser)
    expect(result).toBe(response)
  })

  it('update delegates to UpdateScheduleUseCase with id, dto and currentUser', async () => {
    const id = faker.string.uuid()
    const dto = { startTime: '09:00' } as any
    const response = makeScheduleResponse({ id, startTime: '09:00' })
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update(id, dto, currentUser as any)

    expect(mockUpdate.execute).toHaveBeenCalledWith(id, dto, currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteScheduleUseCase with id and currentUser', async () => {
    const id = faker.string.uuid()
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete(id, currentUser as any)

    expect(mockDelete.execute).toHaveBeenCalledWith(id, currentUser)
  })
})
