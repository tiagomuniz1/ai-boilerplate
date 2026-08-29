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
  // The API signals "no prontuário yet" with a 404, not with 200/null — the
  // ordinary case for any appointment that has not been filled in. Treating it as
  // an error made the section render a failure state over a perfectly normal
  // appointment and hid the "Preencher prontuário" button.
  it('returns null when the API answers 404', async () => {
    ;(medicalRecordsService.getByAppointment as jest.Mock).mockRejectedValue({ status: 404, title: 'Not Found', detail: 'x' })

    await expect(getMedicalRecordByAppointmentUseCase('appt-uuid')).resolves.toBeNull()
  })

  it('rethrows failures that are not a missing record', async () => {
    const failure = { status: 500, title: 'Internal Error', detail: 'boom' }
    ;(medicalRecordsService.getByAppointment as jest.Mock).mockRejectedValue(failure)

    await expect(getMedicalRecordByAppointmentUseCase('appt-uuid')).rejects.toEqual(failure)
  })
})
