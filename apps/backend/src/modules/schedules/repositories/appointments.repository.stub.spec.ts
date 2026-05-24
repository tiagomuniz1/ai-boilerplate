import { AppointmentsRepositoryStub } from './appointments.repository.stub'

describe('AppointmentsRepositoryStub', () => {
  it('always returns false for hasFutureAppointmentsByScheduleId', async () => {
    const stub = new AppointmentsRepositoryStub()
    const result = await stub.hasFutureAppointmentsByScheduleId('any-schedule-id')
    expect(result).toBe(false)
  })
})
