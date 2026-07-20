import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ScheduleExceptionsController } from './schedule-exceptions.controller'
import { CreateScheduleExceptionUseCase } from '../use-cases/create-schedule-exception.use-case'
import { UpdateScheduleExceptionUseCase } from '../use-cases/update-schedule-exception.use-case'
import { DeleteScheduleExceptionUseCase } from '../use-cases/delete-schedule-exception.use-case'
import { FindScheduleExceptionByIdUseCase } from '../use-cases/find-schedule-exception-by-id.use-case'
import { ListScheduleExceptionsUseCase } from '../use-cases/list-schedule-exceptions.use-case'
import { ScheduleException } from '../entities/schedule-exception.entity'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateScheduleExceptionUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateScheduleExceptionUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteScheduleExceptionUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindScheduleExceptionByIdUseCase>
const mockList = { execute: jest.fn() } as unknown as jest.Mocked<ListScheduleExceptionsUseCase>

const CLINIC_ID = 'clinic-uuid'
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }

const makeException = (overrides: Partial<ScheduleException> = {}): ScheduleException =>
  ({
    id: faker.string.uuid(),
    professionalId: faker.string.uuid(),
    clinicId: CLINIC_ID,
    date: '2099-06-20',
    startTime: '08:00',
    endTime: '12:00',
    reason: 'Congresso',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as ScheduleException)

describe('ScheduleExceptionsController', () => {
  let controller: ScheduleExceptionsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ScheduleExceptionsController(
      mockCreate,
      mockUpdate,
      mockDelete,
      mockFindById,
      mockList,
    )
  })

  describe('create', () => {
    it('delegates to CreateScheduleExceptionUseCase and maps entity to response', async () => {
      const dto = { date: '2099-06-20', startTime: '08:00', endTime: '12:00' } as any
      const exception = makeException()
      mockCreate.execute.mockResolvedValue(exception)

      const result = await controller.create(dto, adminUser)

      expect(mockCreate.execute).toHaveBeenCalledWith(dto, adminUser)
      expect(result.id).toBe(exception.id)
      expect(result.professionalId).toBe(exception.professionalId)
      expect(result.date).toBe(exception.date)
      expect(result.startTime).toBe(exception.startTime)
      expect(result.endTime).toBe(exception.endTime)
      expect(result.reason).toBe(exception.reason)
      expect(result.createdAt).toBe(exception.createdAt)
      expect(result.updatedAt).toBe(exception.updatedAt)
    })

    it('maps null startTime/endTime in create response', async () => {
      const dto = { date: '2099-06-20' } as any
      const exception = makeException({ startTime: null, endTime: null, reason: null })
      mockCreate.execute.mockResolvedValue(exception)

      const result = await controller.create(dto, adminUser)

      expect(result.startTime).toBeNull()
      expect(result.endTime).toBeNull()
      expect(result.reason).toBeNull()
    })
  })

  describe('findAll', () => {
    it('delegates to ListScheduleExceptionsUseCase', async () => {
      const query = { page: 1, limit: 20 } as any
      const response = { data: [], total: 0, page: 1, limit: 20 }
      mockList.execute.mockResolvedValue(response as any)

      const result = await controller.findAll(query, adminUser)

      expect(mockList.execute).toHaveBeenCalledWith(query, adminUser)
      expect(result).toBe(response)
    })
  })

  describe('findById', () => {
    it('delegates to FindScheduleExceptionByIdUseCase and maps entity to response', async () => {
      const id = faker.string.uuid()
      const exception = makeException({ id })
      mockFindById.execute.mockResolvedValue(exception)

      const result = await controller.findById(id, adminUser)

      expect(mockFindById.execute).toHaveBeenCalledWith(id, adminUser)
      expect(result.id).toBe(id)
      expect(result.professionalId).toBe(exception.professionalId)
    })
  })

  describe('update', () => {
    it('delegates to UpdateScheduleExceptionUseCase and maps entity to response', async () => {
      const id = faker.string.uuid()
      const dto = { reason: 'Férias' } as any
      const exception = makeException({ id, reason: 'Férias' })
      mockUpdate.execute.mockResolvedValue(exception)

      const result = await controller.update(id, dto, doctorUser)

      expect(mockUpdate.execute).toHaveBeenCalledWith(id, dto, doctorUser)
      expect(result.id).toBe(id)
      expect(result.reason).toBe('Férias')
    })
  })

  describe('delete', () => {
    it('delegates to DeleteScheduleExceptionUseCase', async () => {
      const id = faker.string.uuid()
      mockDelete.execute.mockResolvedValue(undefined)

      await controller.delete(id, adminUser)

      expect(mockDelete.execute).toHaveBeenCalledWith(id, adminUser)
    })
  })
})
