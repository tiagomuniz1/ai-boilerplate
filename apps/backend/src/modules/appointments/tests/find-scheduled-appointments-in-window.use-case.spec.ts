import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus } from '@app/shared'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { FindScheduledAppointmentsInWindowUseCase } from '../use-cases/find-scheduled-appointments-in-window.use-case'

const CLINIC_ID = 'clinic-uuid'
const professionalId = faker.string.uuid()

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId,
  patientId: faker.string.uuid(),
  scheduleId: faker.string.uuid(),
  date: '2099-06-20',
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  hasFutureByProfessionalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

function makeMockDataSource(patientRows: Array<{ apptId: string; patientName: string }> = []): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(patientRows),
  }
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

describe('FindScheduledAppointmentsInWindowUseCase', () => {
  let useCase: FindScheduledAppointmentsInWindowUseCase

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty array when no appointments exist on that day', async () => {
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '08:00', '12:00', CLINIC_ID)

    expect(result).toEqual([])
    expect(mockAppointmentsRepository.findActiveByProfessionalAndDate).toHaveBeenCalledWith(professionalId, '2099-06-20', CLINIC_ID)
  })

  it('returns empty array when appointments do not overlap the block window', async () => {
    const appointment = makeAppointment({ startTime: '13:00', endTime: '13:30' })
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appointment as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '08:00', '12:00', CLINIC_ID)

    expect(result).toEqual([])
  })

  it('returns conflicting appointments that overlap the block window', async () => {
    const appointment = makeAppointment({ startTime: '09:00', endTime: '09:30' })
    const patientRows = [{ apptId: appointment.id, patientName: 'Patient Name' }]
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appointment as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(patientRows), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '08:00', '12:00', CLINIC_ID)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(appointment.id)
    expect(result[0].startTime).toBe('09:00')
    expect(result[0].endTime).toBe('09:30')
    expect(result[0].patientName).toBe('Patient Name')
  })

  it('handles null startTime (full-day block from midnight)', async () => {
    const appointment = makeAppointment({ startTime: '00:30', endTime: '01:00' })
    const patientRows = [{ apptId: appointment.id, patientName: 'Patient A' }]
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appointment as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(patientRows), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', null, '06:00', CLINIC_ID)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(appointment.id)
  })

  it('handles null endTime (full-day block until midnight)', async () => {
    const appointment = makeAppointment({ startTime: '20:00', endTime: '20:30' })
    const patientRows = [{ apptId: appointment.id, patientName: 'Patient B' }]
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appointment as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(patientRows), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '18:00', null, CLINIC_ID)

    expect(result).toHaveLength(1)
  })

  it('handles null startTime and null endTime (full-day block)', async () => {
    const appointment = makeAppointment({ startTime: '10:00', endTime: '10:30' })
    const patientRows = [{ apptId: appointment.id, patientName: 'Patient C' }]
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appointment as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(patientRows), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', null, null, CLINIC_ID)

    expect(result).toHaveLength(1)
  })

  it('filters out non-SCHEDULED appointments', async () => {
    const cancelled = makeAppointment({ startTime: '09:00', endTime: '09:30', status: AppointmentStatus.CANCELLED })
    const completed = makeAppointment({ startTime: '10:00', endTime: '10:30', status: AppointmentStatus.COMPLETED })
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([cancelled as any, completed as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '08:00', '12:00', CLINIC_ID)

    expect(result).toEqual([])
  })

  it('returns empty patientName when no patient row found in DB', async () => {
    const appointment = makeAppointment({ startTime: '09:00', endTime: '09:30' })
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appointment as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource([]), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '08:00', '12:00', CLINIC_ID)

    expect(result).toHaveLength(1)
    expect(result[0].patientName).toBe('')
  })

  it('handles overlap at block boundary — appointment ending exactly at block start is not conflicting', async () => {
    const appointment = makeAppointment({ startTime: '07:30', endTime: '08:00' })
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appointment as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '08:00', '12:00', CLINIC_ID)

    expect(result).toEqual([])
  })

  it('handles overlap at block boundary — appointment starting exactly at block end is not conflicting', async () => {
    const appointment = makeAppointment({ startTime: '12:00', endTime: '12:30' })
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appointment as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '08:00', '12:00', CLINIC_ID)

    expect(result).toEqual([])
  })

  it('handles multiple conflicting appointments', async () => {
    const appt1 = makeAppointment({ startTime: '09:00', endTime: '09:30' })
    const appt2 = makeAppointment({ startTime: '10:00', endTime: '10:30' })
    const patientRows = [
      { apptId: appt1.id, patientName: 'Alice' },
      { apptId: appt2.id, patientName: 'Bob' },
    ]
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([appt1 as any, appt2 as any])
    useCase = new FindScheduledAppointmentsInWindowUseCase(makeMockDataSource(patientRows), mockAppointmentsRepository)

    const result = await useCase.execute(professionalId, '2099-06-20', '08:00', '12:00', CLINIC_ID)

    expect(result).toHaveLength(2)
    expect(result[0].patientName).toBe('Alice')
    expect(result[1].patientName).toBe('Bob')
  })
})
