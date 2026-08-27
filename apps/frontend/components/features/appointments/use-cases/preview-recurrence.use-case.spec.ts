jest.mock('../services/appointments.service')
jest.mock('../mappers/to-recurrence-preview-dto.mapper')
jest.mock('../mappers/to-recurrence-preview-model.mapper')

import { RecurrenceInterval } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { toRecurrencePreviewDto } from '../mappers/to-recurrence-preview-dto.mapper'
import { toRecurrencePreviewModel } from '../mappers/to-recurrence-preview-model.mapper'
import { previewRecurrenceUseCase } from './preview-recurrence.use-case'

const makeInput = () => ({
  patientId: 'pat-uuid',
  date: '2099-06-16',
  startTime: '09:00',
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  occurrenceCount: 3,
})

describe('previewRecurrenceUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to dto, calls the service and maps the response back', async () => {
    const input = makeInput()
    const dto = { ...input }
    const responseDto = { occurrences: [] }
    const model = { occurrences: [] }
    ;(toRecurrencePreviewDto as jest.Mock).mockReturnValue(dto)
    ;(appointmentsService.previewRecurrence as jest.Mock).mockResolvedValue(responseDto)
    ;(toRecurrencePreviewModel as jest.Mock).mockReturnValue(model)

    const result = await previewRecurrenceUseCase(input)

    expect(toRecurrencePreviewDto).toHaveBeenCalledWith(input)
    expect(appointmentsService.previewRecurrence).toHaveBeenCalledWith(dto)
    expect(toRecurrencePreviewModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates errors from the service', async () => {
    ;(toRecurrencePreviewDto as jest.Mock).mockReturnValue(makeInput())
    ;(appointmentsService.previewRecurrence as jest.Mock).mockRejectedValue({
      status: 422,
      title: 'Unprocessable Entity',
    })

    await expect(previewRecurrenceUseCase(makeInput())).rejects.toEqual({
      status: 422,
      title: 'Unprocessable Entity',
    })
  })
})
