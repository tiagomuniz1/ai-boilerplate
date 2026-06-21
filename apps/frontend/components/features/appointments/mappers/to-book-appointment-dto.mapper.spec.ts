import { toBookAppointmentDto } from './to-book-appointment-dto.mapper'

describe('toBookAppointmentDto', () => {
  it('maps all fields correctly', () => {
    const input = {
      doctorId: 'doc-uuid',
      patientId: 'pat-uuid',
      date: '2025-06-20',
      startTime: '08:00',
      reason: 'Consulta de rotina',
    }
    const dto = toBookAppointmentDto(input)

    expect(dto.doctorId).toBe('doc-uuid')
    expect(dto.patientId).toBe('pat-uuid')
    expect(dto.date).toBe('2025-06-20')
    expect(dto.startTime).toBe('08:00')
    expect(dto.reason).toBe('Consulta de rotina')
  })

  it('omits doctorId when undefined (DOCTOR role)', () => {
    const dto = toBookAppointmentDto({
      patientId: 'pat-uuid',
      date: '2025-06-20',
      startTime: '08:00',
    })
    expect(dto.doctorId).toBeUndefined()
  })

  it('transforms empty reason string to undefined', () => {
    const dto = toBookAppointmentDto({
      patientId: 'pat-uuid',
      date: '2025-06-20',
      startTime: '08:00',
      reason: '',
    })
    expect(dto.reason).toBeUndefined()
  })

  it('preserves reason when set', () => {
    const dto = toBookAppointmentDto({
      patientId: 'pat-uuid',
      date: '2025-06-20',
      startTime: '08:00',
      reason: 'Dor de cabeça',
    })
    expect(dto.reason).toBe('Dor de cabeça')
  })

  it('includes specialtyId when set', () => {
    const dto = toBookAppointmentDto({
      patientId: 'pat-uuid',
      date: '2025-06-20',
      startTime: '08:00',
      specialtyId: 'spec-uuid',
    })
    expect(dto.specialtyId).toBe('spec-uuid')
  })

  it('omits specialtyId when undefined', () => {
    const dto = toBookAppointmentDto({
      patientId: 'pat-uuid',
      date: '2025-06-20',
      startTime: '08:00',
    })
    expect(dto.specialtyId).toBeUndefined()
  })

  it('omits specialtyId when empty string', () => {
    const dto = toBookAppointmentDto({
      patientId: 'pat-uuid',
      date: '2025-06-20',
      startTime: '08:00',
      specialtyId: '',
    })
    expect(dto.specialtyId).toBeUndefined()
  })
})
