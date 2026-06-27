import { AppointmentStatus, PatientGender } from '@app/shared'
import { toAppointmentDetailModel } from './to-appointment-detail-model.mapper'
import type { AppointmentDetailResponseDto } from '@app/shared'

const makeDto = (overrides: Partial<AppointmentDetailResponseDto> = {}): AppointmentDetailResponseDto => ({
  id: 'appt-uuid',
  doctorId: 'doc-uuid',
  doctorName: 'Dr. Test',
  patientId: 'pat-uuid',
  patientName: 'Patient One',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  scheduleId: 'sched-uuid',
  date: '2025-06-20',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  patient: {
    fullName: 'Patient One',
    email: 'patient@example.com',
    phoneNumber: '11999990000',
    birthDate: '1990-01-15',
    documentNumber: '12345678901',
    gender: PatientGender.FEMALE,
  },
  ...overrides,
})

describe('toAppointmentDetailModel', () => {
  it('maps base appointment fields from parent mapper', () => {
    const dto = makeDto()
    const model = toAppointmentDetailModel(dto)

    expect(model.id).toBe(dto.id)
    expect(model.doctorId).toBe(dto.doctorId)
    expect(model.doctorName).toBe(dto.doctorName)
    expect(model.patientId).toBe(dto.patientId)
    expect(model.patientName).toBe(dto.patientName)
    expect(model.specialtyId).toBe(dto.specialtyId)
    expect(model.specialtyName).toBe(dto.specialtyName)
    expect(model.scheduleId).toBe(dto.scheduleId)
    expect(model.date).toBe(dto.date)
    expect(model.startTime).toBe(dto.startTime)
    expect(model.endTime).toBe(dto.endTime)
    expect(model.status).toBe(dto.status)
    expect(model.reason).toBe(dto.reason)
    expect(model.cancellationReason).toBe(dto.cancellationReason)
  })

  it('converts createdAt and updatedAt to Date objects', () => {
    const dto = makeDto()
    const model = toAppointmentDetailModel(dto)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.updatedAt).toBeInstanceOf(Date)
  })

  it('maps patient fullName', () => {
    const model = toAppointmentDetailModel(makeDto())
    expect(model.patient.fullName).toBe('Patient One')
  })

  it('maps patient email', () => {
    const model = toAppointmentDetailModel(makeDto())
    expect(model.patient.email).toBe('patient@example.com')
  })

  it('maps patient phoneNumber', () => {
    const model = toAppointmentDetailModel(makeDto())
    expect(model.patient.phoneNumber).toBe('11999990000')
  })

  it('converts birthDate string to local Date', () => {
    const model = toAppointmentDetailModel(makeDto())
    expect(model.patient.birthDate).toBeInstanceOf(Date)
  })

  it('preserves birthDate day when parsed as local time', () => {
    const model = toAppointmentDetailModel(makeDto())
    expect(model.patient.birthDate.getDate()).toBe(15)
    expect(model.patient.birthDate.getMonth()).toBe(0)
    expect(model.patient.birthDate.getFullYear()).toBe(1990)
  })

  it('maps patient documentNumber', () => {
    const model = toAppointmentDetailModel(makeDto())
    expect(model.patient.documentNumber).toBe('12345678901')
  })

  it('maps patient gender', () => {
    const model = toAppointmentDetailModel(makeDto())
    expect(model.patient.gender).toBe(PatientGender.FEMALE)
  })

  it('handles MALE gender', () => {
    const dto = makeDto({ patient: { ...makeDto().patient, gender: PatientGender.MALE } })
    const model = toAppointmentDetailModel(dto)
    expect(model.patient.gender).toBe(PatientGender.MALE)
  })

  it('handles null specialtyId and specialtyName', () => {
    const dto = makeDto({ specialtyId: null, specialtyName: null })
    const model = toAppointmentDetailModel(dto)
    expect(model.specialtyId).toBeNull()
    expect(model.specialtyName).toBeNull()
  })
})
