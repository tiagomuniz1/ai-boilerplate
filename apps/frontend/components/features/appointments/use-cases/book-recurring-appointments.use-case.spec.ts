jest.mock('../services/appointments.service')
jest.mock('../mappers/to-book-recurring-appointments-dto.mapper')
jest.mock('../mappers/to-recurring-appointments-result-model.mapper')

import { RecurrenceInterval } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { toBookRecurringAppointmentsDto } from '../mappers/to-book-recurring-appointments-dto.mapper'
import { toRecurringAppointmentsResultModel } from '../mappers/to-recurring-appointments-result-model.mapper'
import { bookRecurringAppointmentsUseCase } from './book-recurring-appointments.use-case'

const makeInput = () => ({
  patientId: 'pat-uuid',
  startTime: '09:00',
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  dates: ['2099-06-16', '2099-06-23'],
  occurrenceCount: 2,
})

describe('bookRecurringAppointmentsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to dto, calls the service and maps the response back', async () => {
    const input = makeInput()
    const dto = { ...input }
    const responseDto = { seriesId: 'series-uuid', appointments: [] }
    const model = { seriesId: 'series-uuid', createdOccurrenceCount: 2, appointments: [] }
    ;(toBookRecurringAppointmentsDto as jest.Mock).mockReturnValue(dto)
    ;(appointmentsService.bookRecurring as jest.Mock).mockResolvedValue(responseDto)
    ;(toRecurringAppointmentsResultModel as jest.Mock).mockReturnValue(model)

    const result = await bookRecurringAppointmentsUseCase(input)

    expect(toBookRecurringAppointmentsDto).toHaveBeenCalledWith(input)
    expect(appointmentsService.bookRecurring).toHaveBeenCalledWith(dto)
    expect(toRecurringAppointmentsResultModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates the 409 raised when dates stopped being available', async () => {
    ;(toBookRecurringAppointmentsDto as jest.Mock).mockReturnValue(makeInput())
    ;(appointmentsService.bookRecurring as jest.Mock).mockRejectedValue({
      status: 409,
      conflictingOccurrences: [{ date: '2099-06-23' }],
    })

    await expect(bookRecurringAppointmentsUseCase(makeInput())).rejects.toEqual({
      status: 409,
      conflictingOccurrences: [{ date: '2099-06-23' }],
    })
  })
})
