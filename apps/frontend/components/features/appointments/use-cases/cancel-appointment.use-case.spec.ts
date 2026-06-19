jest.mock('../services/appointments.service')
jest.mock('../mappers/to-appointment-model.mapper')

import { AppointmentStatus } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import { cancelAppointmentUseCase } from './cancel-appointment.use-case'

const makeResponseDto = () => ({
  id: 'uuid-1',
  status: AppointmentStatus.CANCELLED,
  cancellationReason: 'Patient unavailable',
})

const makeModel = () => ({
  id: 'uuid-1',
  status: AppointmentStatus.CANCELLED,
  cancellationReason: 'Patient unavailable',
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('cancelAppointmentUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls appointmentsService.cancel with id and input', async () => {
    ;(appointmentsService.cancel as jest.Mock).mockResolvedValue(makeResponseDto())
    ;(toAppointmentModel as jest.Mock).mockReturnValue(makeModel())

    await cancelAppointmentUseCase('uuid-1', { cancellationReason: 'Patient unavailable' })

    expect(appointmentsService.cancel).toHaveBeenCalledWith('uuid-1', {
      cancellationReason: 'Patient unavailable',
    })
  })

  it('maps response and returns model', async () => {
    const responseDto = makeResponseDto()
    const model = makeModel()
    ;(appointmentsService.cancel as jest.Mock).mockResolvedValue(responseDto)
    ;(toAppointmentModel as jest.Mock).mockReturnValue(model)

    const result = await cancelAppointmentUseCase('uuid-1', {})

    expect(toAppointmentModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates errors from service', async () => {
    ;(appointmentsService.cancel as jest.Mock).mockRejectedValue({ status: 422 })
    await expect(cancelAppointmentUseCase('uuid-1', {})).rejects.toEqual({ status: 422 })
  })
})
