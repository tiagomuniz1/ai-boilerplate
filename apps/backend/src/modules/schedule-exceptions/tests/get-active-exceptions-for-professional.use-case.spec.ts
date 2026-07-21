import { DataSource } from 'typeorm'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { GetActiveExceptionsForProfessionalUseCase } from '../use-cases/get-active-exceptions-for-professional.use-case'

const mockScheduleExceptionsRepository: jest.Mocked<IScheduleExceptionsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const DOCTOR_ID = 'doctor-uuid'
const CLINIC_ID = 'clinic-uuid'
const DATE = '2099-06-20'

const makeException = (overrides = {}) => ({
  id: 'exception-uuid',
  clinicId: CLINIC_ID,
  professionalId: DOCTOR_ID,
  date: DATE,
  startTime: '14:00',
  endTime: '18:00',
  reason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('GetActiveExceptionsForProfessionalUseCase', () => {
  let useCase: GetActiveExceptionsForProfessionalUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetActiveExceptionsForProfessionalUseCase(
      {} as DataSource,
      mockScheduleExceptionsRepository,
    )
  })

  it('returns exceptions for the given doctor, clinic, and date', async () => {
    const exceptions = [makeException() as any]
    mockScheduleExceptionsRepository.findActiveByProfessionalAndDate.mockResolvedValue(exceptions)

    const result = await useCase.execute(DOCTOR_ID, CLINIC_ID, DATE)

    expect(mockScheduleExceptionsRepository.findActiveByProfessionalAndDate).toHaveBeenCalledWith(DOCTOR_ID, DATE, CLINIC_ID)
    expect(result).toHaveLength(1)
    expect(result[0].startTime).toBe('14:00')
  })

  it('returns empty array when no exceptions exist', async () => {
    mockScheduleExceptionsRepository.findActiveByProfessionalAndDate.mockResolvedValue([])
    const result = await useCase.execute(DOCTOR_ID, CLINIC_ID, DATE)
    expect(result).toHaveLength(0)
  })
})
