jest.mock('../services/appointments.service')
jest.mock('../mappers/to-appointment-series-model.mapper')

import { appointmentsService } from '../services/appointments.service'
import { toAppointmentSeriesModel } from '../mappers/to-appointment-series-model.mapper'
import { getAppointmentSeriesUseCase } from './get-appointment-series.use-case'

describe('getAppointmentSeriesUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches the series and maps it to a model', async () => {
    const responseDto = { id: 'series-uuid', occurrences: [] }
    const model = { id: 'series-uuid', occurrences: [] }
    ;(appointmentsService.getSeries as jest.Mock).mockResolvedValue(responseDto)
    ;(toAppointmentSeriesModel as jest.Mock).mockReturnValue(model)

    const result = await getAppointmentSeriesUseCase('series-uuid')

    expect(appointmentsService.getSeries).toHaveBeenCalledWith('series-uuid')
    expect(toAppointmentSeriesModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates errors from the service', async () => {
    ;(appointmentsService.getSeries as jest.Mock).mockRejectedValue({ status: 404 })

    await expect(getAppointmentSeriesUseCase('series-uuid')).rejects.toEqual({ status: 404 })
  })
})
