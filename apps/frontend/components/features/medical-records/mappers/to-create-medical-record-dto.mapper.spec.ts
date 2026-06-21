import { toCreateMedicalRecordDto } from './to-create-medical-record-dto.mapper'

describe('toCreateMedicalRecordDto', () => {
  it('maps appointmentId and data', () => {
    const dto = toCreateMedicalRecordDto({ appointmentId: 'appt-uuid', data: { k1: 'value' } })
    expect(dto.appointmentId).toBe('appt-uuid')
    expect(dto.data).toEqual({ k1: 'value' })
  })

  it('includes notes when provided', () => {
    const dto = toCreateMedicalRecordDto({ appointmentId: 'appt-uuid', data: {}, notes: 'Obs' })
    expect(dto.notes).toBe('Obs')
  })

  it('omits notes when not provided', () => {
    const dto = toCreateMedicalRecordDto({ appointmentId: 'appt-uuid', data: {} })
    expect(dto.notes).toBeUndefined()
  })
})
