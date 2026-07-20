import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IDashboardRepository } from '../repositories/dashboard.repository.interface'
import { GetDashboardStatsUseCase } from '../use-cases/get-dashboard-stats.use-case'

const CLINIC_ID = 'clinic-uuid'
const DOCTOR_ID = faker.string.uuid()
const DOCTOR_USER_ID = faker.string.uuid()

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
const userUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER, clinicId: CLINIC_ID }
const doctorUser: ICurrentUser = { id: DOCTOR_USER_ID, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }

const emptyStatusCounts = () => ({
  [AppointmentStatus.SCHEDULED]: 0,
  [AppointmentStatus.CONFIRMED]: 0,
  [AppointmentStatus.COMPLETED]: 0,
  [AppointmentStatus.CANCELLED]: 0,
  [AppointmentStatus.NO_SHOW]: 0,
})

const emptyPatientStats = () => ({ total: 0, newPatients: 0, returning: 0, male: 0, female: 0 })

const mockDashboardRepository: jest.Mocked<IDashboardRepository> = {
  countByStatus: jest.fn(),
  getPatientStats: jest.fn(),
  getProceduresBySpecialty: jest.fn(),
  getInsuranceStats: jest.fn(),
  getCidRanking: jest.fn(),
  getCompletedCountByDay: jest.fn(),
  getAgeDistribution: jest.fn(),
  getTodayBirthdays: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeUseCase() {
  return new GetDashboardStatsUseCase(
    {} as DataSource,
    mockDashboardRepository,
    mockProfessionalsRepository,
    mockCacheService,
  )
}

function setupEmptyRepos() {
  mockDashboardRepository.countByStatus.mockResolvedValue(emptyStatusCounts())
  mockDashboardRepository.getPatientStats.mockResolvedValue(emptyPatientStats())
  mockDashboardRepository.getProceduresBySpecialty.mockResolvedValue([])
  mockDashboardRepository.getInsuranceStats.mockResolvedValue({ particular: 0, convenio: 0 })
  mockDashboardRepository.getCidRanking.mockResolvedValue([])
  mockDashboardRepository.getCompletedCountByDay.mockResolvedValue([])
  mockDashboardRepository.getAgeDistribution.mockResolvedValue([])
  mockDashboardRepository.getTodayBirthdays.mockResolvedValue([])
}

describe('GetDashboardStatsUseCase', () => {
  let useCase: GetDashboardStatsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = makeUseCase()
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: DOCTOR_ID } as any)
    setupEmptyRepos()
  })

  describe('period resolution', () => {
    it('uses last 30 days when from/to are omitted', async () => {
      await useCase.execute({}, adminUser)

      const call = mockDashboardRepository.countByStatus.mock.calls[0]
      const today = new Date().toISOString().split('T')[0]
      const expectedFrom = new Date()
      expectedFrom.setUTCDate(expectedFrom.getUTCDate() - 29)
      const fromStr = expectedFrom.toISOString().split('T')[0]

      expect(call[1]).toBe(fromStr)
      expect(call[2]).toBe(today)
    })

    it('respects explicit from/to', async () => {
      await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)

      const call = mockDashboardRepository.countByStatus.mock.calls[0]
      expect(call[1]).toBe('2026-01-01')
      expect(call[2]).toBe('2026-01-31')
    })

    it('throws UnprocessableEntityException when from > to', async () => {
      await expect(useCase.execute({ from: '2026-06-22', to: '2026-06-01' }, adminUser)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })
  })

  describe('doctor resolution', () => {
    it('DOCTOR uses own professionalId and ignores query.professionalId', async () => {
      const someOtherId = faker.string.uuid()
      await useCase.execute({ professionalId: someOtherId }, doctorUser)

      const call = mockDashboardRepository.countByStatus.mock.calls[0]
      expect(call[3]).toBe(DOCTOR_ID)
      expect(call[3]).not.toBe(someOtherId)
    })

    it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
      await expect(useCase.execute({}, doctorUser)).rejects.toThrow(ForbiddenException)
    })

    it('ADMIN uses query.professionalId when provided', async () => {
      const filterId = faker.string.uuid()
      await useCase.execute({ professionalId: filterId }, adminUser)

      const call = mockDashboardRepository.countByStatus.mock.calls[0]
      expect(call[3]).toBe(filterId)
    })

    it('ADMIN passes undefined professionalId when not provided', async () => {
      await useCase.execute({}, adminUser)

      const call = mockDashboardRepository.countByStatus.mock.calls[0]
      expect(call[3]).toBeUndefined()
    })

    it('USER uses query.professionalId when provided', async () => {
      const filterId = faker.string.uuid()
      await useCase.execute({ professionalId: filterId }, userUser)

      const call = mockDashboardRepository.countByStatus.mock.calls[0]
      expect(call[3]).toBe(filterId)
    })
  })

  describe('appointmentsByDay gap fill', () => {
    it('fills all days in the range including days without appointments', async () => {
      mockDashboardRepository.getCompletedCountByDay.mockResolvedValue([
        { date: '2026-01-02', count: 3 },
      ])

      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-04' }, adminUser)

      expect(result.appointmentsByDay).toHaveLength(4)
      expect(result.appointmentsByDay).toEqual([
        { date: '2026-01-01', count: 0 },
        { date: '2026-01-02', count: 3 },
        { date: '2026-01-03', count: 0 },
        { date: '2026-01-04', count: 0 },
      ])
    })

    it('returns single day when from === to', async () => {
      mockDashboardRepository.getCompletedCountByDay.mockResolvedValue([{ date: '2026-01-01', count: 2 }])

      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-01' }, adminUser)

      expect(result.appointmentsByDay).toEqual([{ date: '2026-01-01', count: 2 }])
    })
  })

  describe('DTO assembly', () => {
    it('maps KPIs correctly from countByStatus', async () => {
      mockDashboardRepository.countByStatus.mockResolvedValue({
        [AppointmentStatus.SCHEDULED]: 3,
        [AppointmentStatus.CONFIRMED]: 2,
        [AppointmentStatus.COMPLETED]: 10,
        [AppointmentStatus.CANCELLED]: 1,
        [AppointmentStatus.NO_SHOW]: 4,
      })

      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)

      expect(result.kpi).toEqual({ scheduled: 3, confirmed: 2, completed: 10, noShow: 4 })
    })

    it('computes procedures.total as sum of items values', async () => {
      mockDashboardRepository.getProceduresBySpecialty.mockResolvedValue([
        { label: 'Cardiologia', value: 5 },
        { label: 'Neurologia', value: 3 },
      ])

      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)

      expect(result.procedures.total).toBe(8)
      expect(result.procedures.items).toHaveLength(2)
    })

    it('computes cidRanking.total as sum of items values', async () => {
      mockDashboardRepository.getCidRanking.mockResolvedValue([
        { label: 'M54.5', value: 5 },
        { label: 'J11', value: 3 },
      ])

      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)

      expect(result.cidRanking.total).toBe(8)
      expect(result.cidRanking.items).toEqual([
        { label: 'M54.5', value: 5 },
        { label: 'J11', value: 3 },
      ])
    })

    it('returns cidRanking.total = 0 when no certificates', async () => {
      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)
      expect(result.cidRanking).toEqual({ total: 0, items: [] })
    })

    it('computes insurance.total = particular + convenio', async () => {
      mockDashboardRepository.getInsuranceStats.mockResolvedValue({ particular: 7, convenio: 3 })

      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)

      expect(result.insurance).toEqual({ particular: 7, convenio: 3, total: 10 })
    })

    it('maps patients correctly', async () => {
      mockDashboardRepository.getPatientStats.mockResolvedValue({
        total: 5,
        newPatients: 3,
        returning: 2,
        male: 2,
        female: 3,
      })

      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)

      expect(result.patients).toEqual({
        total: 5,
        newPatients: 3,
        returningPatients: 2,
        byGender: { male: 2, female: 3 },
      })
    })

    it('returns period in response', async () => {
      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)
      expect(result.period).toEqual({ from: '2026-01-01', to: '2026-01-31' })
    })
  })

  describe('cache', () => {
    it('returns cached response without calling repository', async () => {
      const cached = { period: { from: '2026-01-01', to: '2026-01-31' } } as any
      mockCacheService.get.mockResolvedValue(cached)

      const result = await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)

      expect(result).toBe(cached)
      expect(mockDashboardRepository.countByStatus).not.toHaveBeenCalled()
    })

    it('populates cache on miss', async () => {
      mockCacheService.get.mockResolvedValue(null)

      await useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:'),
        expect.any(Object),
        60,
      )
    })

    it('continues when cache read fails', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis error'))

      await expect(useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)).resolves.toBeDefined()
    })

    it('continues when cache write fails', async () => {
      mockCacheService.get.mockResolvedValue(null)
      mockCacheService.set.mockRejectedValue(new Error('Redis error'))

      await expect(useCase.execute({ from: '2026-01-01', to: '2026-01-31' }, adminUser)).resolves.toBeDefined()
    })
  })
})
