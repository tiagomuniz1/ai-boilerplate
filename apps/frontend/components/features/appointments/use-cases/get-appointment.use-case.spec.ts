jest.mock('../services/appointments.service')
jest.mock('../mappers/to-appointment-detail-model.mapper')

import { AppointmentStatus, PatientGender } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { toAppointmentDetailModel } from '../mappers/to-appointment-detail-model.mapper'
import { getAppointmentUseCase } from './get-appointment.use-case'
import type { IAppointmentDetailModel } from '../types/appointment-model.types'

const makeDto = () => ({
  id: 'uuid-1',
  professionalId: 'doc-uuid',
  professionalName: 'Dr. Test',
  patientId: 'pat-uuid',
  patientName: 'Patient',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'sched-uuid',
  date: '2025-06-20',
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    fullName: 'Patient',
    email: 'patient@test.com',
    phoneNumber: '11999990000',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: PatientGender.MALE,
  },
})

const makeModel = (): IAppointmentDetailModel => ({
  ...(makeDto() as any),
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    fullName: 'Patient',
    email: 'patient@test.com',
    phoneNumber: '11999990000',
    birthDate: new Date('1990-01-01T00:00:00'),
    documentNumber: '12345678901',
    gender: PatientGender.MALE,
  },
})

describe('getAppointmentUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls appointmentsService.getById with id', async () => {
    const dto = makeDto()
    ;(appointmentsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toAppointmentDetailModel as jest.Mock).mockReturnValue(makeModel())

    await getAppointmentUseCase('uuid-1')

    expect(appointmentsService.getById).toHaveBeenCalledWith('uuid-1')
  })

  it('maps dto with toAppointmentDetailModel and returns model', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(appointmentsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toAppointmentDetailModel as jest.Mock).mockReturnValue(model)

    const result = await getAppointmentUseCase('uuid-1')

    expect(toAppointmentDetailModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from service', async () => {
    ;(appointmentsService.getById as jest.Mock).mockRejectedValue({ status: 404 })
    await expect(getAppointmentUseCase('uuid-1')).rejects.toEqual({ status: 404 })
  })
})
