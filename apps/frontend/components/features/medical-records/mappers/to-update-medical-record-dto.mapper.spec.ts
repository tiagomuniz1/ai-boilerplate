import { toUpdateMedicalRecordDto } from './to-update-medical-record-dto.mapper'

describe('toUpdateMedicalRecordDto', () => {
  it('returns empty object when no fields provided', () => {
    expect(toUpdateMedicalRecordDto({})).toEqual({})
  })

  it('maps data when provided', () => {
    const dto = toUpdateMedicalRecordDto({ data: { k1: 'val' } })
    expect(dto.data).toEqual({ k1: 'val' })
  })

  it('maps notes when provided', () => {
    const dto = toUpdateMedicalRecordDto({ notes: 'Obs' })
    expect(dto.notes).toBe('Obs')
  })

  it('omits fields not provided', () => {
    const dto = toUpdateMedicalRecordDto({ notes: 'Obs' })
    expect(dto.data).toBeUndefined()
  })
})
