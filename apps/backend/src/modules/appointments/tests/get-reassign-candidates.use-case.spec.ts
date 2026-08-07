import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, CouncilType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { ResolveProfessionalSlotUseCase } from '../use-cases/resolve-professional-slot.use-case'
import { GetReassignCandidatesUseCase } from '../use-cases/get-reassign-candidates.use-case'

const CLINIC_ID = 'clinic-uuid'
const originalProfessionalId = faker.string.uuid()
const specialtyId = faker.string.uuid()

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeProfessional = (id: string, specialtyIds: string[], councilType = CouncilType.CRM, fullName = 'Dr. X') =>
  ({
    id,
    user: { fullName },
    registrations: [{ councilType, isPrimary: true }],
    professionalSpecialties: specialtyIds.map((sid) => ({ specialtyId: sid, specialty: { id: sid, name: 'Cardiologia' } })),
  }) as any

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId: originalProfessionalId,
  specialtyId,
  date: '2099-06-20',
  startTime: '08:00',
  status: AppointmentStatus.SCHEDULED,
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

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  countByClinic: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockResolveSlot = {
  execute: jest.fn(),
} as unknown as jest.Mocked<ResolveProfessionalSlotUseCase>

function makeMockDataSource(specialtyName: string | null = 'Cardiologia'): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(specialtyName ? [{ name: specialtyName }] : []),
  }
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

const build = (dataSource?: DataSource) =>
  new GetReassignCandidatesUseCase(
    dataSource ?? makeMockDataSource(),
    mockAppointmentsRepository,
    mockProfessionalsRepository,
    mockResolveSlot,
  )

describe('GetReassignCandidatesUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockProfessionalsRepository.findById.mockResolvedValue(makeProfessional(originalProfessionalId, [specialtyId]))
    mockResolveSlot.execute.mockResolvedValue({ scheduleId: 's', endTime: '08:30' } as any)
  })

  it('throws NotFoundException when appointment does not exist', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(build().execute('missing', adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws 422 when the appointment is not scheduled', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(
      makeAppointment({ status: AppointmentStatus.CANCELLED }) as any,
    )
    await expect(build().execute('id', adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws NotFoundException when the original professional is missing', async () => {
    mockProfessionalsRepository.findById.mockResolvedValue(null)
    await expect(build().execute('id', adminUser)).rejects.toThrow(NotFoundException)
  })

  it('returns only same-specialty professionals who are available, excluding the current one', async () => {
    const sameSpecialtyAvailable = makeProfessional(faker.string.uuid(), [specialtyId], CouncilType.CRM, 'Dr. Ana')
    const otherSpecialty = makeProfessional(faker.string.uuid(), [faker.string.uuid()])
    const current = makeProfessional(originalProfessionalId, [specialtyId])
    mockProfessionalsRepository.findAll.mockResolvedValue([
      [current, sameSpecialtyAvailable, otherSpecialty],
      3,
    ] as any)

    const result = await build().execute('id', adminUser)

    expect(result).toEqual([
      { professionalId: sameSpecialtyAvailable.id, professionalName: 'Dr. Ana', specialtyName: 'Cardiologia' },
    ])
  })

  it('excludes eligible professionals who are unavailable at the slot', async () => {
    const eligible = makeProfessional(faker.string.uuid(), [specialtyId])
    mockProfessionalsRepository.findAll.mockResolvedValue([[eligible], 1] as any)
    mockResolveSlot.execute.mockResolvedValue(null)

    const result = await build().execute('id', adminUser)

    expect(result).toEqual([])
  })

  it('returns null specialtyName when the specialty lookup finds no row', async () => {
    const eligible = makeProfessional(faker.string.uuid(), [specialtyId], CouncilType.CRM, 'Dr. Ana')
    mockProfessionalsRepository.findAll.mockResolvedValue([[eligible], 1] as any)

    const result = await build(makeMockDataSource(null)).execute('id', adminUser)

    expect(result).toEqual([
      { professionalId: eligible.id, professionalName: 'Dr. Ana', specialtyName: null },
    ])
  })

  it('filters by council for a generalist appointment and returns null specialtyName', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    mockProfessionalsRepository.findById.mockResolvedValue(
      makeProfessional(originalProfessionalId, [], CouncilType.CRN),
    )
    const sameCouncil = makeProfessional(faker.string.uuid(), [], CouncilType.CRN, 'Dr. Nut')
    const otherCouncil = makeProfessional(faker.string.uuid(), [], CouncilType.CREFITO)
    mockProfessionalsRepository.findAll.mockResolvedValue([[sameCouncil, otherCouncil], 2] as any)

    const result = await build(makeMockDataSource(null)).execute('id', adminUser)

    expect(result).toEqual([
      { professionalId: sameCouncil.id, professionalName: 'Dr. Nut', specialtyName: null },
    ])
  })
})
