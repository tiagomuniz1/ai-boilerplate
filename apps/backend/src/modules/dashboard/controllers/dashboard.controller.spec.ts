import { faker } from '@faker-js/faker'
import { AppointmentStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { DashboardController } from './dashboard.controller'
import { GetDashboardStatsUseCase } from '../use-cases/get-dashboard-stats.use-case'

const mockGetDashboardStats = { execute: jest.fn() } as unknown as jest.Mocked<GetDashboardStatsUseCase>

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: faker.string.uuid() }

const makeDashboardResponse = () => ({
  period: { from: '2026-05-23', to: '2026-06-22' },
  kpi: { scheduled: 2, confirmed: 1, completed: 5, noShow: 1 },
  patients: { total: 4, newPatients: 2, returningPatients: 2, byGender: { male: 2, female: 2 } },
  procedures: { total: 5, items: [{ label: 'Cardiologia', value: 5 }] },
  insurance: { total: 3, particular: 2, convenio: 1 },
  cidRanking: { total: 5, items: [{ label: 'M54.5', value: 5 }] },
  appointmentsByDay: [{ date: '2026-06-22', count: 1 }],
  ageDistribution: [{ age: 35, count: 2 }],
  todayBirthdays: [],
})

describe('DashboardController', () => {
  let controller: DashboardController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new DashboardController(mockGetDashboardStats)
  })

  it('getStats delegates to GetDashboardStatsUseCase', async () => {
    const query = { from: '2026-05-23', to: '2026-06-22' }
    const response = makeDashboardResponse()
    mockGetDashboardStats.execute.mockResolvedValue(response as any)

    const result = await controller.getStats(query as any, adminUser)

    expect(mockGetDashboardStats.execute).toHaveBeenCalledWith(query, adminUser)
    expect(result).toBe(response)
  })
})
