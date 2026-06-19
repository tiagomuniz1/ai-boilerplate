jest.mock('../services/appointments.service')
jest.mock('../mappers/to-appointment-model.mapper')

import { AppointmentStatus } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import { completeAppointmentUseCase } from './complete-appointment.use-case'

const makeResponseDto = () => ({
  id: 'uuid-1',
  status: AppointmentStatus.COMPLETED,
})

const makeModel = () => ({
  id: 'uuid-1',
  status: AppointmentStatus.COMPLETED,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('completeAppointmentUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls appointmentsService.complete with id', async () => {
    ;(appointmentsService.complete as jest.Mock).mockResolvedValue(makeResponseDto())
    ;(toAppointmentModel as jest.Mock).mockReturnValue(makeModel())

    await completeAppointmentUseCase('uuid-1')

    expect(appointmentsService.complete).toHaveBeenCalledWith('uuid-1')
  })

  it('maps response and returns model', async () => {
    const responseDto = makeResponseDto()
    const model = makeModel()
    ;(appointmentsService.complete as jest.Mock).mockResolvedValue(responseDto)
    ;(toAppointmentModel as jest.Mock).mockReturnValue(model)

    const result = await completeAppointmentUseCase('uuid-1')

    expect(toAppointmentModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates errors from service', async () => {
    ;(appointmentsService.complete as jest.Mock).mockRejectedValue({ status: 422 })
    await expect(completeAppointmentUseCase('uuid-1')).rejects.toEqual({ status: 422 })
  })
})
