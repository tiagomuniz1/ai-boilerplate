jest.mock('../services/appointments.service')
jest.mock('../mappers/to-book-appointment-dto.mapper')
jest.mock('../mappers/to-appointment-model.mapper')

import { AppointmentStatus } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { toBookAppointmentDto } from '../mappers/to-book-appointment-dto.mapper'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import { bookAppointmentUseCase } from './book-appointment.use-case'

const makeInput = () => ({
  patientId: 'pat-uuid',
  date: '2025-06-20',
  startTime: '08:00',
  reason: 'Test reason',
})

const makeDto = () => ({
  patientId: 'pat-uuid',
  date: '2025-06-20',
  startTime: '08:00',
  reason: 'Test reason',
})

const makeResponseDto = () => ({
  id: 'uuid-1',
  status: AppointmentStatus.SCHEDULED,
})

const makeModel = () => ({
  id: 'uuid-1',
  status: AppointmentStatus.SCHEDULED,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('bookAppointmentUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to dto and calls appointmentsService.book', async () => {
    const input = makeInput()
    const dto = makeDto()
    ;(toBookAppointmentDto as jest.Mock).mockReturnValue(dto)
    ;(appointmentsService.book as jest.Mock).mockResolvedValue(makeResponseDto())
    ;(toAppointmentModel as jest.Mock).mockReturnValue(makeModel())

    await bookAppointmentUseCase(input)

    expect(toBookAppointmentDto).toHaveBeenCalledWith(input)
    expect(appointmentsService.book).toHaveBeenCalledWith(dto)
  })

  it('maps response dto to model and returns it', async () => {
    const responseDto = makeResponseDto()
    const model = makeModel()
    ;(toBookAppointmentDto as jest.Mock).mockReturnValue(makeDto())
    ;(appointmentsService.book as jest.Mock).mockResolvedValue(responseDto)
    ;(toAppointmentModel as jest.Mock).mockReturnValue(model)

    const result = await bookAppointmentUseCase(makeInput())

    expect(toAppointmentModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates errors from service', async () => {
    ;(toBookAppointmentDto as jest.Mock).mockReturnValue(makeDto())
    ;(appointmentsService.book as jest.Mock).mockRejectedValue({ status: 409, title: 'Conflict' })

    await expect(bookAppointmentUseCase(makeInput())).rejects.toEqual({
      status: 409,
      title: 'Conflict',
    })
  })
})
