import type { DashboardResponseDto } from '@app/shared'
import type { IDashboardModel } from '../types/dashboard.types'

export function toDashboardModel(dto: DashboardResponseDto): IDashboardModel {
  return {
    period: {
      from: new Date(dto.period.from + 'T00:00:00'),
      to: new Date(dto.period.to + 'T00:00:00'),
    },
    kpi: dto.kpi,
    patients: dto.patients,
    procedures: dto.procedures,
    insurance: dto.insurance,
    cidRanking: dto.cidRanking,
    appointmentsByDay: dto.appointmentsByDay.map((d) => ({
      // Anchor at local midnight like `period` above. `new Date('YYYY-MM-DD')`
      // parses as UTC, so in a UTC-behind timezone every point on the timeline
      // would be labelled with the day before the one it counts.
      date: new Date(d.date + 'T00:00:00'),
      count: d.count,
    })),
    ageDistribution: dto.ageDistribution,
    todayBirthdays: dto.todayBirthdays,
  }
}
