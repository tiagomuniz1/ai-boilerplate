jest.mock('../services/medical-records.service')
jest.mock('../mappers/to-medical-record-model.mapper')

import { medicalRecordsService } from '../services/medical-records.service'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import { getMedicalRecordByAppointmentUseCase } from './get-medical-record-by-appointment.use-case'

describe('getMedicalRecordByAppointmentUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches by appointmentId and maps to model', async () => {
    const dto = { id: 'uuid-1' }
    const model = { id: 'uuid-1' }
    ;(medicalRecordsService.getByAppointment as jest.Mock).mockResolvedValue(dto)
    ;(toMedicalRecordModel as jest.Mock).mockReturnValue(model)

    const result = await getMedicalRecordByAppointmentUseCase('appt-uuid')

    expect(medicalRecordsService.getByAppointment).toHaveBeenCalledWith('appt-uuid')
    expect(toMedicalRecordModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('returns null when service returns null', async () => {
    ;(medicalRecordsService.getByAppointment as jest.Mock).mockResolvedValue(null)

    const result = await getMedicalRecordByAppointmentUseCase('appt-uuid')

    expect(result).toBeNull()
    expect(toMedicalRecordModel).not.toHaveBeenCalled()
  })
})
