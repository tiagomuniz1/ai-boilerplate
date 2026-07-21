import { ForbiddenException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus, DashboardResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { DashboardQueryDto } from '../dto/dashboard-query.dto'
import { IDashboardRepository } from '../repositories/dashboard.repository.interface'

@Injectable()
export class GetDashboardStatsUseCase extends BaseUseCase {
  private readonly logger = new Logger(GetDashboardStatsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly dashboardRepository: IDashboardRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: DashboardQueryDto, currentUser: ICurrentUser): Promise<DashboardResponseDto> {
    const clinicId = currentUser.clinicId!

    const today = new Date().toISOString().split('T')[0]
    const defaultFrom = this.addDays(today, -29)

    const from = query.from ?? defaultFrom
    const to = query.to ?? today

    if (from > to) {
      throw new UnprocessableEntityException('from must not be after to')
    }

    let effectiveProfessionalId: string | undefined

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new ForbiddenException('No professional profile found for current user')
      effectiveProfessionalId = professional.id
    } else {
      effectiveProfessionalId = query.professionalId
    }

    const cacheKey = `dashboard:${clinicId}:${effectiveProfessionalId ?? 'all'}:${from}:${to}`

    try {
      const cached = await this.cacheService.get<DashboardResponseDto>(cacheKey)
      if (cached) return cached
    } catch (error) {
      this.logger.warn('Cache read failed', { context: 'GetDashboardStatsUseCase' })
    }

    const [statusCounts, patientStats, procedures, insurance, cidRanking, completedByDay, ageDistribution, birthdays] =
      await Promise.all([
        this.dashboardRepository.countByStatus(clinicId, from, to, effectiveProfessionalId),
        this.dashboardRepository.getPatientStats(clinicId, from, to, effectiveProfessionalId),
        this.dashboardRepository.getProceduresBySpecialty(clinicId, from, to, effectiveProfessionalId),
        this.dashboardRepository.getInsuranceStats(clinicId, from, to, effectiveProfessionalId),
        this.dashboardRepository.getCidRanking(clinicId, from, to, effectiveProfessionalId),
        this.dashboardRepository.getCompletedCountByDay(clinicId, from, to, effectiveProfessionalId),
        this.dashboardRepository.getAgeDistribution(clinicId, from, to, effectiveProfessionalId),
        this.dashboardRepository.getTodayBirthdays(clinicId, effectiveProfessionalId),
      ])

    const appointmentsByDay = this.fillDayGaps(from, to, completedByDay)

    const result: DashboardResponseDto = {
      period: { from, to },
      kpi: {
        scheduled: statusCounts[AppointmentStatus.SCHEDULED],
        confirmed: statusCounts[AppointmentStatus.CONFIRMED],
        completed: statusCounts[AppointmentStatus.COMPLETED],
        noShow: statusCounts[AppointmentStatus.NO_SHOW],
      },
      patients: {
        total: patientStats.total,
        newPatients: patientStats.newPatients,
        returningPatients: patientStats.returning,
        byGender: { male: patientStats.male, female: patientStats.female },
      },
      procedures: {
        total: procedures.reduce((sum, p) => sum + p.value, 0),
        items: procedures,
      },
      insurance: {
        particular: insurance.particular,
        convenio: insurance.convenio,
        total: insurance.particular + insurance.convenio,
      },
      cidRanking: {
        total: cidRanking.reduce((sum, c) => sum + c.value, 0),
        items: cidRanking,
      },
      appointmentsByDay,
      ageDistribution,
      todayBirthdays: birthdays,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch (error) {
      this.logger.warn('Cache write failed', { context: 'GetDashboardStatsUseCase' })
    }

    return result
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().split('T')[0]
  }

  private fillDayGaps(
    from: string,
    to: string,
    rows: { date: string; count: number }[],
  ): { date: string; count: number }[] {
    const countMap = new Map(rows.map((r) => [r.date, r.count]))
    const result: { date: string; count: number }[] = []

    const current = new Date(from + 'T00:00:00Z')
    const end = new Date(to + 'T00:00:00Z')

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      result.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 })
      current.setUTCDate(current.getUTCDate() + 1)
    }

    return result
  }
}
