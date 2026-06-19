jest.mock('../services/appointments.service')
jest.mock('../mappers/to-appointment-model.mapper')

import { AppointmentStatus } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import { listAppointmentsUseCase } from './list-appointments.use-case'
import type { IAppointmentModel } from '../types/appointment-model.types'

const makeDto = (id = 'uuid-1') => ({
  id,
  doctorId: 'doc-uuid',
  doctorName: 'Dr. Test',
  patientId: 'pat-uuid',
  patientName: 'Patient',
  scheduleId: 'sched-uuid',
  date: '2025-06-20',
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeModel = (id = 'uuid-1'): IAppointmentModel => ({
  ...(makeDto(id) as any),
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('listAppointmentsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls appointmentsService.getAll without params when none provided', async () => {
    ;(appointmentsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
    await listAppointmentsUseCase()
    expect(appointmentsService.getAll).toHaveBeenCalledWith(undefined)
  })

  it('passes params to appointmentsService.getAll', async () => {
    const params = { doctorId: 'doc-uuid', status: AppointmentStatus.SCHEDULED }
    ;(appointmentsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
    await listAppointmentsUseCase(params)
    expect(appointmentsService.getAll).toHaveBeenCalledWith(params)
  })

  it('maps each dto with toAppointmentModel', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(appointmentsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })
    ;(toAppointmentModel as jest.Mock).mockReturnValue(model)

    const result = await listAppointmentsUseCase()

    expect(toAppointmentModel).toHaveBeenCalledWith(dto, 0, [dto])
    expect(result.data).toEqual([model])
  })

  it('returns pagination metadata from response', async () => {
    ;(appointmentsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 42, page: 3, limit: 10 })

    const result = await listAppointmentsUseCase()

    expect(result.total).toBe(42)
    expect(result.page).toBe(3)
    expect(result.limit).toBe(10)
  })

  it('propagates errors from service', async () => {
    ;(appointmentsService.getAll as jest.Mock).mockRejectedValue(new Error('Network error'))
    await expect(listAppointmentsUseCase()).rejects.toThrow('Network error')
  })
})
