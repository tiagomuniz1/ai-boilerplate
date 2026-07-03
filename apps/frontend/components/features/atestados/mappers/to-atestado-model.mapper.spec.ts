import { MedicalCertificateType } from '@app/shared'
import { toAtestadoModel } from './to-atestado-model.mapper'

const makeLeaveDto = () => ({
  id: 'cert-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Maria Santos',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. João',
  type: MedicalCertificateType.LEAVE,
  daysOff: 3,
  startDate: '2026-01-05' as unknown as string,
  cidCode: 'M54.5',
  attendanceDate: null,
  checkInTime: null,
  checkOutTime: null,
  observations: 'Repouso absoluto.',
  issuedAt: '2026-06-28T10:00:00.000Z' as unknown as Date,
  createdAt: '2026-06-28T10:00:00.000Z' as unknown as Date,
})

const makeAttendanceDto = () => ({
  ...makeLeaveDto(),
  type: MedicalCertificateType.ATTENDANCE,
  daysOff: null,
  startDate: null,
  cidCode: null,
  attendanceDate: '2026-01-05' as unknown as string,
  checkInTime: '08:00',
  checkOutTime: '08:30',
})

describe('toAtestadoModel', () => {
  it('maps all scalar fields correctly for LEAVE', () => {
    const model = toAtestadoModel(makeLeaveDto() as any)
    expect(model.id).toBe('cert-uuid')
    expect(model.appointmentId).toBe('appt-uuid')
    expect(model.patientName).toBe('Maria Santos')
    expect(model.doctorName).toBe('Dr. João')
    expect(model.type).toBe(MedicalCertificateType.LEAVE)
    expect(model.daysOff).toBe(3)
    expect(model.cidCode).toBe('M54.5')
    expect(model.observations).toBe('Repouso absoluto.')
  })

  it('converts startDate string to Date for LEAVE', () => {
    const model = toAtestadoModel(makeLeaveDto() as any)
    expect(model.startDate).toBeInstanceOf(Date)
    expect(model.startDate?.toISOString().slice(0, 10)).toBe('2026-01-05')
  })

  it('sets attendance fields to null for LEAVE', () => {
    const model = toAtestadoModel(makeLeaveDto() as any)
    expect(model.attendanceDate).toBeNull()
    expect(model.checkInTime).toBeNull()
    expect(model.checkOutTime).toBeNull()
  })

  it('converts attendanceDate string to Date for ATTENDANCE', () => {
    const model = toAtestadoModel(makeAttendanceDto() as any)
    expect(model.attendanceDate).toBeInstanceOf(Date)
    expect(model.checkInTime).toBe('08:00')
    expect(model.checkOutTime).toBe('08:30')
  })

  it('sets leave fields to null for ATTENDANCE', () => {
    const model = toAtestadoModel(makeAttendanceDto() as any)
    expect(model.daysOff).toBeNull()
    expect(model.startDate).toBeNull()
    expect(model.cidCode).toBeNull()
  })

  it('converts issuedAt and createdAt strings to Date', () => {
    const model = toAtestadoModel(makeLeaveDto() as any)
    expect(model.issuedAt).toBeInstanceOf(Date)
    expect(model.issuedAt.toISOString()).toBe('2026-06-28T10:00:00.000Z')
    expect(model.createdAt).toBeInstanceOf(Date)
  })

  it('preserves null observations', () => {
    const dto = { ...makeLeaveDto(), observations: null }
    const model = toAtestadoModel(dto as any)
    expect(model.observations).toBeNull()
  })

  it('preserves null startDate without instantiating Date', () => {
    const dto = { ...makeAttendanceDto(), startDate: null }
    const model = toAtestadoModel(dto as any)
    expect(model.startDate).toBeNull()
  })
})
