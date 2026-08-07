jest.mock('../services/appointments.service')
jest.mock('../mappers/to-appointment-model.mapper')

import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import { reassignAppointmentUseCase } from './reassign-appointment.use-case'

describe('reassignAppointmentUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls appointmentsService.reassign with id and professionalId', async () => {
    const dto = { id: 'apt-1', professionalId: 'doc-2' }
    ;(appointmentsService.reassign as jest.Mock).mockResolvedValue(dto)
    ;(toAppointmentModel as jest.Mock).mockReturnValue({ ...dto, mapped: true })

    await reassignAppointmentUseCase('apt-1', 'doc-2')

    expect(appointmentsService.reassign).toHaveBeenCalledWith('apt-1', 'doc-2')
  })

  it('maps the response and returns the model', async () => {
    const responseDto = { id: 'apt-1', professionalId: 'doc-2' }
    const model = { id: 'apt-1', mapped: true }
    ;(appointmentsService.reassign as jest.Mock).mockResolvedValue(responseDto)
    ;(toAppointmentModel as jest.Mock).mockReturnValue(model)

    const result = await reassignAppointmentUseCase('apt-1', 'doc-2')

    expect(toAppointmentModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates errors from the service', async () => {
    ;(appointmentsService.reassign as jest.Mock).mockRejectedValue({ status: 422 })
    await expect(reassignAppointmentUseCase('apt-1', 'doc-2')).rejects.toEqual({ status: 422 })
  })
})
