import type { DashboardResponseDto } from '@app/shared'
import type { IDashboardModel } from '../types/dashboard.types'

export function toDashboardModel(dto: DashboardResponseDto): IDashboardModel {
  return {
    period: {
      from: new Date(dto.period.from),
      to: new Date(dto.period.to),
    },
    kpi: dto.kpi,
    patients: dto.patients,
    procedures: dto.procedures,
    insurance: dto.insurance,
    cidRanking: dto.cidRanking,
    appointmentsByDay: dto.appointmentsByDay.map((d) => ({
      date: new Date(d.date),
      count: d.count,
    })),
    ageDistribution: dto.ageDistribution,
    todayBirthdays: dto.todayBirthdays,
  }
}
