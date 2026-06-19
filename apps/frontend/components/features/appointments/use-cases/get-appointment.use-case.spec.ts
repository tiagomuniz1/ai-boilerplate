jest.mock('../services/appointments.service')
jest.mock('../mappers/to-appointment-model.mapper')

import { AppointmentStatus } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import { getAppointmentUseCase } from './get-appointment.use-case'
import type { IAppointmentModel } from '../types/appointment-model.types'

const makeDto = () => ({
  id: 'uuid-1',
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

const makeModel = (): IAppointmentModel => ({ ...(makeDto() as any) })

describe('getAppointmentUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls appointmentsService.getById with id', async () => {
    const dto = makeDto()
    ;(appointmentsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toAppointmentModel as jest.Mock).mockReturnValue(makeModel())

    await getAppointmentUseCase('uuid-1')

    expect(appointmentsService.getById).toHaveBeenCalledWith('uuid-1')
  })

  it('maps dto with toAppointmentModel and returns model', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(appointmentsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toAppointmentModel as jest.Mock).mockReturnValue(model)

    const result = await getAppointmentUseCase('uuid-1')

    expect(toAppointmentModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from service', async () => {
    ;(appointmentsService.getById as jest.Mock).mockRejectedValue({ status: 404 })
    await expect(getAppointmentUseCase('uuid-1')).rejects.toEqual({ status: 404 })
  })
})
