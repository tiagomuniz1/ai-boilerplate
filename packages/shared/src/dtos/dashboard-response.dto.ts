export class DashboardKpiDto {
  scheduled: number
  confirmed: number
  completed: number
  noShow: number
}

export class DashboardPatientStatsDto {
  total: number
  newPatients: number
  returningPatients: number
  byGender: { male: number; female: number }
}

export class DashboardProcedureItemDto {
  label: string
  value: number
}

export class DashboardProceduresDto {
  total: number
  items: DashboardProcedureItemDto[]
}

export class DashboardInsuranceDto {
  total: number
  particular: number
  convenio: number
}

export class DashboardCidRankingItemDto {
  label: string
  value: number
}

export class DashboardCidRankingDto {
  total: number
  items: DashboardCidRankingItemDto[]
}

export class DashboardDayCountDto {
  date: string
  count: number
}

export class DashboardAgeDistributionDto {
  age: number
  count: number
}

export class DashboardBirthdayDto {
  patientId: string
  fullName: string
  age: number
}

export class DashboardResponseDto {
  period: { from: string; to: string }
  kpi: DashboardKpiDto
  patients: DashboardPatientStatsDto
  procedures: DashboardProceduresDto
  insurance: DashboardInsuranceDto
  cidRanking: DashboardCidRankingDto
  appointmentsByDay: DashboardDayCountDto[]
  ageDistribution: DashboardAgeDistributionDto[]
  todayBirthdays: DashboardBirthdayDto[]
}
