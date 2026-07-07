import { MedicalCertificateType } from '@app/shared'
import { toCreateAtestadoDto } from './to-create-atestado-dto.mapper'

describe('toCreateAtestadoDto', () => {
  const baseLeaveInput = {
    appointmentId: 'appt-uuid',
    type: MedicalCertificateType.LEAVE,
    daysOff: 3,
    startDate: '2026-01-05',
  }

  const baseAttendanceInput = {
    appointmentId: 'appt-uuid',
    type: MedicalCertificateType.ATTENDANCE,
    attendanceDate: '2026-01-05',
    checkInTime: '08:00',
    checkOutTime: '08:30',
  }

  it('maps appointmentId, type and LEAVE fields', () => {
    const dto = toCreateAtestadoDto(baseLeaveInput)
    expect(dto.appointmentId).toBe('appt-uuid')
    expect(dto.type).toBe(MedicalCertificateType.LEAVE)
    expect(dto.daysOff).toBe(3)
    expect(dto.startDate).toBe('2026-01-05')
  })

  it('omits ATTENDANCE fields for LEAVE type', () => {
    const dto = toCreateAtestadoDto(baseLeaveInput)
    expect(dto).not.toHaveProperty('attendanceDate')
    expect(dto).not.toHaveProperty('checkInTime')
    expect(dto).not.toHaveProperty('checkOutTime')
  })

  it('includes cidCode when provided for LEAVE', () => {
    const dto = toCreateAtestadoDto({ ...baseLeaveInput, cidCode: 'M54.5' })
    expect(dto.cidCode).toBe('M54.5')
  })

  it('omits cidCode when not provided', () => {
    const dto = toCreateAtestadoDto(baseLeaveInput)
    expect(dto).not.toHaveProperty('cidCode')
  })

  it('omits cidCode when empty string', () => {
    const dto = toCreateAtestadoDto({ ...baseLeaveInput, cidCode: '' })
    expect(dto).not.toHaveProperty('cidCode')
  })

  it('maps appointmentId, type and ATTENDANCE fields', () => {
    const dto = toCreateAtestadoDto(baseAttendanceInput)
    expect(dto.type).toBe(MedicalCertificateType.ATTENDANCE)
    expect(dto.attendanceDate).toBe('2026-01-05')
    expect(dto.checkInTime).toBe('08:00')
    expect(dto.checkOutTime).toBe('08:30')
  })

  it('omits LEAVE fields for ATTENDANCE type', () => {
    const dto = toCreateAtestadoDto(baseAttendanceInput)
    expect(dto).not.toHaveProperty('daysOff')
    expect(dto).not.toHaveProperty('startDate')
    expect(dto).not.toHaveProperty('cidCode')
  })

  it('omits observations when not provided', () => {
    const dto = toCreateAtestadoDto(baseLeaveInput)
    expect(dto).not.toHaveProperty('observations')
  })

  it('omits observations when empty string', () => {
    const dto = toCreateAtestadoDto({ ...baseLeaveInput, observations: '' })
    expect(dto).not.toHaveProperty('observations')
  })

  it('includes observations when provided', () => {
    const dto = toCreateAtestadoDto({ ...baseLeaveInput, observations: 'Repouso absoluto.' })
    expect(dto.observations).toBe('Repouso absoluto.')
  })

  it('omits crmId and specialtyId when not provided', () => {
    const dto = toCreateAtestadoDto(baseLeaveInput)
    expect(dto).not.toHaveProperty('crmId')
    expect(dto).not.toHaveProperty('specialtyId')
  })

  it('includes crmId and specialtyId when provided', () => {
    const dto = toCreateAtestadoDto({ ...baseLeaveInput, crmId: 'crm-2', specialtyId: 'spec-2' })
    expect(dto.crmId).toBe('crm-2')
    expect(dto.specialtyId).toBe('spec-2')
  })
})
